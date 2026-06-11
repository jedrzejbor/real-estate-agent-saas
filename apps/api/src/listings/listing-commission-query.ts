import { ListingCommissionType } from '../common/enums';

export function buildListingCommissionAmountSql(alias: string): string {
  const commissionTypeColumn = `${alias}."commissionType"`;
  const commissionValueColumn = `${alias}."commissionValue"`;
  const priceColumn = `${alias}."price"`;

  return `CASE
    WHEN ${commissionTypeColumn} = '${ListingCommissionType.PERCENTAGE}' AND ${commissionValueColumn} IS NOT NULL
      THEN ${priceColumn} * ${commissionValueColumn} / 100
    WHEN ${commissionTypeColumn} = '${ListingCommissionType.FIXED}' AND ${commissionValueColumn} IS NOT NULL
      THEN ${commissionValueColumn}
    ELSE 0
  END`;
}

export function buildListingCommissionSumSql(alias: string): string {
  return `COALESCE(SUM(${buildListingCommissionAmountSql(alias)}), 0)::numeric`;
}
