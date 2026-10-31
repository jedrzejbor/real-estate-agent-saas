import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentService } from '../payments/application/payment.service';
import { PaymentId, toPaymentAmountMinor } from '../payments/domain/payment.types';
import { Payment } from '../payments/infrastructure/typeorm/payment.entity';
import { TpayPaymentAdapter } from '../payments/infrastructure/tpay/tpay-payment.adapter';
import { ListingOrder } from './entities';
import { ListingOrderStatus } from './listing-commerce.types';
import { RequestListingRefundDto } from './dto/request-listing-refund.dto';

/** Admin-only application entry point. The controller owns auth; this validates the target. */
@Injectable()
export class ListingRefundsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly tpayGateway: TpayPaymentAdapter | null,
  ) {}

  async requestRefund(actorUserId: string, orderId: string, dto: RequestListingRefundDto) {
    // Validate the target before inserting an intent or contacting the provider.
    const amountMinor = toPaymentAmountMinor(dto.amountMinor);
    const [order, payment] = await Promise.all([
      this.dataSource.getRepository(ListingOrder).findOneBy({ id: orderId }),
      this.dataSource.getRepository(Payment).findOneBy({ id: dto.paymentId as PaymentId }),
    ]);
    if (!order || !payment || payment.orderId !== order.id || payment.kind !== 'listing') {
      throw new NotFoundException('Płatność dla zamówienia nie istnieje');
    }
    if (order.status !== ListingOrderStatus.PAID || payment.status !== 'confirmed' ||
        order.currency !== payment.currency || order.totalGrossAmount !== payment.amountMinor ||
        payment.provider !== 'tpay' || !payment.providerTransactionId) {
      throw new ConflictException('Zamówienie nie ma kwalifikującej się opłaconej płatności');
    }
    if (amountMinor > payment.amountMinor ||
        (dto.kind === 'full' && amountMinor !== payment.amountMinor)) {
      throw new ConflictException('Kwota zwrotu przekracza kwalifikującą się płatność');
    }
    if (!this.tpayGateway) throw new ServiceUnavailableException('Operator zwrotów jest niedostępny');

    const refund = await this.paymentService.requestRefund(this.dataSource, this.tpayGateway, {
      actorUserId,
      paymentId: payment.id,
      intentKey: dto.intentKey,
      kind: dto.kind,
      amountMinor,
    });
    return {
      refundId: refund.id,
      paymentId: refund.paymentId,
      intentKey: refund.intentKey,
      kind: refund.kind,
      amountMinor: refund.amountMinor,
      status: refund.status,
      requestedByUserId: refund.requestedByUserId,
      createdAt: refund.createdAt,
    };
  }
}
