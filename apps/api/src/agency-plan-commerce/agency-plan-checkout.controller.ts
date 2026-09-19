import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanQuotesService } from './agency-plan-quotes.service';
import { CreateAgencyPlanQuoteDto } from './dto';

@Controller('agency-plan-checkout')
export class AgencyPlanCheckoutController {
  constructor(
    private readonly agencyPlanQuotesService: AgencyPlanQuotesService,
    private readonly agencyPlanPromotionsService: AgencyPlanPromotionsService,
  ) {}

  /** POST /api/agency-plan-checkout/quote — authoritative plan quote snapshot. */
  @Public()
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async createQuote(@Body() dto: CreateAgencyPlanQuoteDto) {
    const { plan, quoteInput } =
      await this.agencyPlanQuotesService.prepareQuoteInput({
        planCode: dto.planCode,
        billingInterval: dto.billingInterval,
      });
    const discounts = await this.agencyPlanPromotionsService.resolveQuoteDiscounts({
      plan,
      billingInterval: dto.billingInterval,
      promotionCode: dto.promotionCode,
    });

    return this.agencyPlanQuotesService.createQuote({
      ...quoteInput,
      discounts,
    });
  }
}
