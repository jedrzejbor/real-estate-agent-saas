import { IsUUID } from 'class-validator';

export class CreateAgencyPlanCheckoutAttemptDto {
  @IsUUID()
  quoteId: string;
}
