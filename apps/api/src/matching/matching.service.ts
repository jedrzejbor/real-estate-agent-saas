import { Injectable } from '@nestjs/common';
import { ListingStatus } from '../common/enums';
import {
  type MatchingClientInput,
  type MatchingListingInput,
  type MatchingReason,
  type MatchingScoreResult,
} from './matching.types';

const SCORE_WEIGHTS = {
  budget: 25,
  propertyType: 15,
  transactionType: 15,
  city: 15,
  district: 10,
  area: 10,
  rooms: 10,
} as const;

@Injectable()
export class MatchingService {
  scoreClientListingMatch(
    client: MatchingClientInput,
    listing: MatchingListingInput,
  ): MatchingScoreResult {
    const reasons: MatchingReason[] = [];

    if (listing.status !== ListingStatus.ACTIVE) {
      return excluded('listing_not_active', 'Oferta nie jest aktywna');
    }

    const price = toPositiveNumber(listing.price);
    const budgetMax = getBudgetCeiling(client);

    if (price !== null && budgetMax !== null && price > budgetMax) {
      return excluded(
        'price_above_budget',
        'Cena oferty przekracza budżet klienta',
      );
    }

    let score = 0;
    const budgetScore = this.scoreBudget(client, price, reasons);
    const propertyTypeScore = this.scorePropertyType(client, listing, reasons);
    const transactionTypeScore = this.scoreTransactionType(
      client,
      listing,
      reasons,
    );
    const cityScore = this.scoreCity(client, listing, reasons);
    const districtScore = this.scoreDistrict(client, listing, reasons);
    const areaScore = this.scoreArea(client, listing, reasons);
    const roomsScore = this.scoreRooms(client, listing, reasons);

    score += budgetScore;
    score += propertyTypeScore;
    score += transactionTypeScore;
    score += cityScore;
    score += districtScore;
    score += areaScore;
    score += roomsScore;

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      isExcluded: false,
      reasons,
    };
  }

  private scoreBudget(
    client: MatchingClientInput,
    price: number | null,
    reasons: MatchingReason[],
  ): number {
    const budgetMin = toPositiveNumber(client.budgetMin);
    const budgetMax = getBudgetCeiling(client);

    if (price === null) {
      reasons.push(
        neutral('price_missing', 'Oferta nie ma ceny do porównania'),
      );
      return SCORE_WEIGHTS.budget * 0.35;
    }

    if (budgetMax === null && budgetMin === null) {
      reasons.push(
        neutral('budget_missing', 'Klient nie ma uzupełnionego budżetu'),
      );
      return SCORE_WEIGHTS.budget * 0.5;
    }

    if (budgetMax !== null && price <= budgetMax) {
      reasons.push(
        positive('price_within_budget', 'Cena mieści się w budżecie'),
      );
      return SCORE_WEIGHTS.budget;
    }

    if (budgetMin !== null && price >= budgetMin) {
      reasons.push(
        positive(
          'price_above_min_budget',
          'Cena pasuje do dolnego progu budżetu',
        ),
      );
      return SCORE_WEIGHTS.budget * 0.75;
    }

    reasons.push(
      neutral('budget_partially_known', 'Budżet klienta jest niepełny'),
    );
    return SCORE_WEIGHTS.budget * 0.5;
  }

  private scorePropertyType(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const preferredType = client.preference?.propertyType ?? null;

    if (!preferredType) {
      reasons.push(
        neutral(
          'property_type_missing',
          'Klient nie ma preferowanego typu nieruchomości',
        ),
      );
      return SCORE_WEIGHTS.propertyType * 0.5;
    }

    if (preferredType === listing.propertyType) {
      reasons.push(
        positive(
          'property_type_match',
          'Typ nieruchomości pasuje do preferencji',
        ),
      );
      return SCORE_WEIGHTS.propertyType;
    }

    reasons.push(
      negative(
        'property_type_mismatch',
        'Typ nieruchomości różni się od preferencji',
      ),
    );
    return 0;
  }

  private scoreTransactionType(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const preferredType = client.preference?.transactionType ?? null;

    if (!preferredType) {
      reasons.push(
        neutral(
          'transaction_type_missing',
          'Klient nie ma preferowanego typu transakcji',
        ),
      );
      return SCORE_WEIGHTS.transactionType * 0.5;
    }

    if (preferredType === listing.transactionType) {
      reasons.push(
        positive(
          'transaction_type_match',
          'Typ transakcji pasuje do preferencji',
        ),
      );
      return SCORE_WEIGHTS.transactionType;
    }

    reasons.push(
      negative(
        'transaction_type_mismatch',
        'Typ transakcji różni się od preferencji',
      ),
    );
    return 0;
  }

  private scoreCity(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const preferredCity = normalizeText(client.preference?.preferredCity);
    const listingCity = normalizeText(listing.address?.city);

    if (!preferredCity) {
      reasons.push(
        neutral('preferred_city_missing', 'Klient nie ma preferowanego miasta'),
      );
      return SCORE_WEIGHTS.city * 0.5;
    }

    if (listingCity && listingCity === preferredCity) {
      reasons.push(positive('city_match', 'Miasto pasuje do preferencji'));
      return SCORE_WEIGHTS.city;
    }

    reasons.push(negative('city_mismatch', 'Miasto różni się od preferencji'));
    return 0;
  }

  private scoreDistrict(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const preferredDistrict = normalizeText(
      client.preference?.preferredDistrict,
    );
    const listingDistrict = normalizeText(listing.address?.district);

    if (!preferredDistrict) {
      reasons.push(
        neutral(
          'preferred_district_missing',
          'Klient nie ma preferowanej dzielnicy',
        ),
      );
      return SCORE_WEIGHTS.district * 0.5;
    }

    if (listingDistrict && listingDistrict === preferredDistrict) {
      reasons.push(
        positive('district_match', 'Dzielnica pasuje do preferencji'),
      );
      return SCORE_WEIGHTS.district;
    }

    reasons.push(
      negative('district_mismatch', 'Dzielnica różni się od preferencji'),
    );
    return 0;
  }

  private scoreArea(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const minArea = toPositiveNumber(client.preference?.minArea);
    const listingArea = toPositiveNumber(listing.areaM2);

    if (minArea === null) {
      reasons.push(
        neutral('min_area_missing', 'Klient nie ma minimalnego metrażu'),
      );
      return SCORE_WEIGHTS.area * 0.5;
    }

    if (listingArea === null) {
      reasons.push(
        neutral('listing_area_missing', 'Oferta nie ma metrażu do porównania'),
      );
      return SCORE_WEIGHTS.area * 0.35;
    }

    if (listingArea >= minArea) {
      reasons.push(positive('area_match', 'Metraż spełnia preferencje'));
      return SCORE_WEIGHTS.area;
    }

    reasons.push(
      negative('area_too_small', 'Metraż jest niższy niż preferowany'),
    );
    return 0;
  }

  private scoreRooms(
    client: MatchingClientInput,
    listing: MatchingListingInput,
    reasons: MatchingReason[],
  ): number {
    const minRooms = toPositiveNumber(client.preference?.minRooms);

    if (minRooms === null) {
      reasons.push(
        neutral('min_rooms_missing', 'Klient nie ma minimalnej liczby pokoi'),
      );
      return SCORE_WEIGHTS.rooms * 0.5;
    }

    if (!listing.rooms) {
      reasons.push(
        neutral(
          'listing_rooms_missing',
          'Oferta nie ma liczby pokoi do porównania',
        ),
      );
      return SCORE_WEIGHTS.rooms * 0.35;
    }

    if (listing.rooms >= minRooms) {
      reasons.push(positive('rooms_match', 'Liczba pokoi spełnia preferencje'));
      return SCORE_WEIGHTS.rooms;
    }

    reasons.push(
      negative('rooms_too_low', 'Liczba pokoi jest niższa niż preferowana'),
    );
    return 0;
  }
}

function getBudgetCeiling(client: MatchingClientInput): number | null {
  const budgetMax = toPositiveNumber(client.budgetMax);
  const preferenceMaxPrice = toPositiveNumber(client.preference?.maxPrice);
  const ceilings = [budgetMax, preferenceMaxPrice].filter(
    (value): value is number => value !== null,
  );

  return ceilings.length > 0 ? Math.min(...ceilings) : null;
}

function toPositiveNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function positive(code: string, label: string): MatchingReason {
  return { code, label, type: 'positive' };
}

function neutral(code: string, label: string): MatchingReason {
  return { code, label, type: 'neutral' };
}

function negative(code: string, label: string): MatchingReason {
  return { code, label, type: 'negative' };
}

function excluded(code: string, label: string): MatchingScoreResult {
  return {
    score: 0,
    isExcluded: true,
    reasons: [negative(code, label)],
  };
}
