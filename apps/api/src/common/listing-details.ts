export enum ListingMarketType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export enum ListingCondition {
  DEVELOPER_STANDARD = 'developer_standard',
  SHELL = 'shell',
  TO_RENOVATE = 'to_renovate',
  TO_REFRESH = 'to_refresh',
  GOOD = 'good',
  VERY_GOOD = 'very_good',
}

export enum ListingOwnershipType {
  FULL_OWNERSHIP = 'full_ownership',
  COOPERATIVE_OWNERSHIP = 'cooperative_ownership',
  SHARE = 'share',
}

export enum ListingBuildingType {
  LOW_BLOCK = 'low_block',
  HIGH_BLOCK = 'high_block',
  APARTMENT_BUILDING = 'apartment_building',
  TENEMENT = 'tenement',
  DETACHED = 'detached',
  OFFICE_BUILDING = 'office_building',
  WAREHOUSE = 'warehouse',
  MIXED_USE = 'mixed_use',
}

export enum ListingHouseType {
  DETACHED = 'detached',
  SEMI_DETACHED = 'semi_detached',
  TERRACED = 'terraced',
  RESIDENCE = 'residence',
  RECREATIONAL = 'recreational',
}

export enum ListingPlotType {
  BUILDING = 'building',
  AGRICULTURAL = 'agricultural',
  RECREATIONAL = 'recreational',
  INVESTMENT = 'investment',
  FOREST = 'forest',
  COMMERCIAL = 'commercial',
}

export enum ListingPlotShape {
  RECTANGLE = 'rectangle',
  SQUARE = 'square',
  TRAPEZOID = 'trapezoid',
  IRREGULAR = 'irregular',
}

export enum ListingAccessRoadType {
  ASPHALT = 'asphalt',
  PAVED = 'paved',
  GRAVEL = 'gravel',
  DIRT = 'dirt',
  EASEMENT = 'easement',
  NONE = 'none',
}

export enum ListingLocalPlanStatus {
  YES = 'yes',
  NO = 'no',
  IN_PROGRESS = 'in_progress',
  UNKNOWN = 'unknown',
}

export enum ListingDevelopmentConditionsStatus {
  ISSUED = 'issued',
  NOT_ISSUED = 'not_issued',
  IN_PROGRESS = 'in_progress',
  NOT_REQUIRED = 'not_required',
  UNKNOWN = 'unknown',
}

export enum ListingHeatingType {
  DISTRICT = 'district',
  GAS = 'gas',
  ELECTRIC = 'electric',
  HEAT_PUMP = 'heat_pump',
  SOLID_FUEL = 'solid_fuel',
  OIL = 'oil',
  OTHER = 'other',
}

export enum ListingGarageType {
  UNDERGROUND = 'underground',
  GARAGE_HALL = 'garage_hall',
  DETACHED = 'detached',
  PARKING_SPACE = 'parking_space',
  CARPORT = 'carport',
  NONE = 'none',
}

export enum ListingCommercialPurpose {
  RETAIL = 'retail',
  OFFICE = 'office',
  SERVICE = 'service',
  GASTRONOMY = 'gastronomy',
  MEDICAL = 'medical',
  WAREHOUSE = 'warehouse',
  PRODUCTION = 'production',
  MIXED = 'mixed',
  OTHER = 'other',
}

export interface ListingDetails {
  marketType?: ListingMarketType;
  condition?: ListingCondition;
  ownershipType?: ListingOwnershipType;
  buildingType?: ListingBuildingType;
  houseType?: ListingHouseType;
  plotType?: ListingPlotType;
  plotShape?: ListingPlotShape;
  accessRoadType?: ListingAccessRoadType;
  localPlanStatus?: ListingLocalPlanStatus;
  developmentConditionsStatus?: ListingDevelopmentConditionsStatus;
  heatingType?: ListingHeatingType;
  garageType?: ListingGarageType;
  commercialPurpose?: ListingCommercialPurpose;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  parkingSpaces?: number;
  rentAdministrativeFee?: number;
  deposit?: number;
  availableFrom?: string;
  priceNegotiable?: boolean;
}
