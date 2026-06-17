import { GeocodeAddressDto } from './dto/geocode-address.dto';

export type GeocodingPrecision =
  | 'rooftop'
  | 'parcel'
  | 'street'
  | 'interpolated'
  | 'approximate';

export interface NormalizedGeocodeAddress {
  city: string;
  street: string;
  district?: string | null;
  postalCode?: string | null;
  voivodeship?: string | null;
  country: 'PL';
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  precision: GeocodingPrecision;
  confidence: number;
  provider: string;
}

export interface GeocodingResponse {
  query: string;
  result: GeocodingResult | null;
  warning?: string;
}

export interface GeocodingProvider {
  readonly name: string;
  geocode(address: NormalizedGeocodeAddress): Promise<GeocodingResponse>;
}

export type GeocodeAddressInput = Pick<
  GeocodeAddressDto,
  'city' | 'street' | 'district' | 'postalCode' | 'voivodeship' | 'country'
>;
