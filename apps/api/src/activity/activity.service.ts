import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, type ActivityLogChange } from './entities/activity-log.entity';
import { Agent } from '../users/entities/agent.entity';
import { ActivityAction, ActivityEntityType } from '../common/enums';

interface LogActivityInput {
  userId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description?: string;
  changes?: ActivityLogChange[];
}

export interface ActivityHistoryItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description: string | null;
  changes: ActivityLogChange[];
  createdAt: Date;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async log(input: LogActivityInput): Promise<void> {
    const agent = await this.resolveAgent(input.userId);

    const log = this.activityRepo.create({
      agentId: agent.id,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      description: input.description,
      changes: input.changes ?? [],
    });

    await this.activityRepo.save(log);
  }

  async findEntityHistory(
    userId: string,
    entityType: ActivityEntityType,
    entityId: string,
  ): Promise<ActivityHistoryItem[]> {
    const agent = await this.resolveAgent(userId);

    const logs = await this.activityRepo.find({
      where: {
        agentId: agent.id,
        entityType,
        entityId,
      },
      relations: ['agent', 'agent.user'],
      order: {
        createdAt: 'DESC',
      },
    });

    return logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      description: log.description ?? null,
      changes: log.changes ?? [],
      createdAt: log.createdAt,
      actor: {
        id: log.agent.id,
        firstName: log.agent.firstName ?? null,
        lastName: log.agent.lastName ?? null,
        email: log.agent.user?.email ?? null,
      },
    }));
  }

  async findLatestStatusChange(
    userId: string,
    entityType: ActivityEntityType,
    entityId: string,
  ): Promise<ActivityHistoryItem | null> {
    const agent = await this.resolveAgent(userId);

    const log = await this.activityRepo.findOne({
      where: {
        agentId: agent.id,
        entityType,
        entityId,
        action: ActivityAction.STATUS_CHANGED,
      },
      relations: ['agent', 'agent.user'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!log) {
      return null;
    }

    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      description: log.description ?? null,
      changes: log.changes ?? [],
      createdAt: log.createdAt,
      actor: {
        id: log.agent.id,
        firstName: log.agent.firstName ?? null,
        lastName: log.agent.lastName ?? null,
        email: log.agent.user?.email ?? null,
      },
    };
  }

  buildChanges(
    previousState: Record<string, unknown>,
    nextState: Record<string, unknown>,
  ): ActivityLogChange[] {
    const keys = new Set([
      ...Object.keys(previousState),
      ...Object.keys(nextState),
    ]);

    const changes: ActivityLogChange[] = [];

    for (const key of keys) {
      const oldValue = previousState[key] ?? null;
      const newValue = nextState[key] ?? null;

      if (this.areEqual(oldValue, newValue)) {
        continue;
      }

      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }

    return changes;
  }

  private areEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    return agent;
  }
}
