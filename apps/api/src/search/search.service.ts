import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities/agent.entity';
import { SearchQueryDto } from './dto/search-query.dto';

export type SearchEntityType = 'listing' | 'client' | 'appointment';

export interface SearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
  timestamp?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  groups: Record<SearchEntityType, SearchResultItem[]>;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  async search(userId: string, query: SearchQueryDto): Promise<SearchResponse> {
    const trimmedQuery = query.q?.trim() ?? '';
    const limitPerType = query.limitPerType ?? 5;

    if (trimmedQuery.length < 2) {
      return {
        query: trimmedQuery,
        total: 0,
        groups: {
          listing: [],
          client: [],
          appointment: [],
        },
      };
    }

    const agent = await this.resolveAgent(userId);
    const term = `%${trimmedQuery.toLowerCase()}%`;

    const [listings, clients, appointments] = await Promise.all([
      this.searchListings(agent.id, term, limitPerType),
      this.searchClients(agent.id, term, limitPerType),
      this.searchAppointments(agent.id, term, limitPerType),
    ]);

    return {
      query: trimmedQuery,
      total: listings.length + clients.length + appointments.length,
      groups: {
        listing: listings,
        client: clients,
        appointment: appointments,
      },
    };
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }
    return agent;
  }

  private async searchListings(
    agentId: string,
    term: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const listings = await this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.address', 'address')
      .where('listing.agentId = :agentId', { agentId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(listing.title) LIKE :term', { term })
            .orWhere('LOWER(COALESCE(listing.description, \"\")) LIKE :term', {
              term,
            })
            .orWhere('LOWER(COALESCE(address.city, \"\")) LIKE :term', {
              term,
            })
            .orWhere('LOWER(COALESCE(address.street, \"\")) LIKE :term', {
              term,
            });
        }),
      )
      .orderBy('listing.updatedAt', 'DESC')
      .take(limit)
      .getMany();

    return listings.map((listing) => ({
      id: listing.id,
      entityType: 'listing',
      title: listing.title,
      subtitle: [listing.address?.city, listing.address?.street]
        .filter(Boolean)
        .join(', '),
      href: `/dashboard/listings/${listing.id}`,
      status: listing.status,
      timestamp: listing.updatedAt.toISOString(),
    }));
  }

  private async searchClients(
    agentId: string,
    term: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const clients = await this.clientRepo
      .createQueryBuilder('client')
      .where('client.agentId = :agentId', { agentId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(client.firstName) LIKE :term', { term })
            .orWhere('LOWER(client.lastName) LIKE :term', { term })
            .orWhere(
              "LOWER(CONCAT(client.firstName, ' ', client.lastName)) LIKE :term",
              { term },
            )
            .orWhere('LOWER(COALESCE(client.email, \"\")) LIKE :term', { term })
            .orWhere('LOWER(COALESCE(client.phone, \"\")) LIKE :term', { term });
        }),
      )
      .orderBy('client.updatedAt', 'DESC')
      .take(limit)
      .getMany();

    return clients.map((client) => ({
      id: client.id,
      entityType: 'client',
      title: `${client.firstName} ${client.lastName}`.trim(),
      subtitle: client.email || client.phone || 'Brak danych kontaktowych',
      href: `/dashboard/clients/${client.id}`,
      status: client.status,
      timestamp: client.updatedAt.toISOString(),
    }));
  }

  private async searchAppointments(
    agentId: string,
    term: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const appointments = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.listing', 'listing')
      .where('appointment.agentId = :agentId', { agentId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(appointment.title) LIKE :term', { term })
            .orWhere('LOWER(COALESCE(appointment.location, \"\")) LIKE :term', {
              term,
            })
            .orWhere('LOWER(COALESCE(client.firstName, \"\")) LIKE :term', {
              term,
            })
            .orWhere('LOWER(COALESCE(client.lastName, \"\")) LIKE :term', {
              term,
            })
            .orWhere(
              "LOWER(CONCAT(COALESCE(client.firstName, ''), ' ', COALESCE(client.lastName, ''))) LIKE :term",
              { term },
            )
            .orWhere('LOWER(COALESCE(listing.title, \"\")) LIKE :term', { term });
        }),
      )
      .orderBy('appointment.startTime', 'ASC')
      .take(limit)
      .getMany();

    return appointments.map((appointment) => ({
      id: appointment.id,
      entityType: 'appointment',
      title: appointment.title,
      subtitle:
        appointment.location ||
        `${appointment.client?.firstName ?? ''} ${appointment.client?.lastName ?? ''}`.trim() ||
        appointment.listing?.title ||
        'Spotkanie',
      href: `/dashboard/calendar/${appointment.id}`,
      status: appointment.status,
      timestamp: appointment.startTime.toISOString(),
    }));
  }
}
