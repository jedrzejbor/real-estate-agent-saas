import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingAccessRoadType,
  ListingBuildingType,
  ListingCommercialPurpose,
  ListingCondition,
  ListingDevelopmentConditionsStatus,
  ListingGarageType,
  ListingHeatingType,
  ListingHouseType,
  ListingLocalPlanStatus,
  ListingMarketType,
  ListingOwnershipType,
  ListingPlotShape,
  ListingPlotType,
} from './listing-details';

export class ListingDetailsDto {
  @IsOptional()
  @IsEnum(ListingMarketType)
  marketType?: ListingMarketType;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsEnum(ListingOwnershipType)
  ownershipType?: ListingOwnershipType;

  @IsOptional()
  @IsEnum(ListingBuildingType)
  buildingType?: ListingBuildingType;

  @IsOptional()
  @IsEnum(ListingHouseType)
  houseType?: ListingHouseType;

  @IsOptional()
  @IsEnum(ListingPlotType)
  plotType?: ListingPlotType;

  @IsOptional()
  @IsEnum(ListingPlotShape)
  plotShape?: ListingPlotShape;

  @IsOptional()
  @IsEnum(ListingAccessRoadType)
  accessRoadType?: ListingAccessRoadType;

  @IsOptional()
  @IsEnum(ListingLocalPlanStatus)
  localPlanStatus?: ListingLocalPlanStatus;

  @IsOptional()
  @IsEnum(ListingDevelopmentConditionsStatus)
  developmentConditionsStatus?: ListingDevelopmentConditionsStatus;

  @IsOptional()
  @IsEnum(ListingHeatingType)
  heatingType?: ListingHeatingType;

  @IsOptional()
  @IsEnum(ListingGarageType)
  garageType?: ListingGarageType;

  @IsOptional()
  @IsEnum(ListingCommercialPurpose)
  commercialPurpose?: ListingCommercialPurpose;

  @IsOptional()
  @IsBoolean()
  hasBalcony?: boolean;

  @IsOptional()
  @IsBoolean()
  hasElevator?: boolean;

  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  parkingSpaces?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAdministrativeFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsBoolean()
  priceNegotiable?: boolean;
}
