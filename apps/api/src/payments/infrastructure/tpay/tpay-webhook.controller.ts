import {
  BadRequestException,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { PaymentService, VerifiedPaymentNotification } from '../../application/payment.service';
import { TpayJwsVerifier } from './tpay-jws.verifier';

/** Signed transaction receipt only; PAY-028 owns payment fulfillment. */
@Controller('payments/webhooks')
export class TpayWebhookController {
  private readonly logger = new Logger(TpayWebhookController.name);

  constructor(
    private readonly verifier: TpayJwsVerifier,
    private readonly dataSource: DataSource,
    private readonly payments: PaymentService,
  ) {}

  @Post('tpay')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async receiveNotification(@Req() request: RawBodyRequest<Request>): Promise<'TRUE'> {
    const contentType = request.headers['content-type'];
    if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(contentType ?? '')) {
      this.logger.warn('Rejected Tpay webhook: unsupported content type');
      throw new UnsupportedMediaTypeException('Unsupported notification content type');
    }

    const signature = request.headers['x-jws-signature'];
    const valid = await this.verifier.verify(
      typeof signature === 'string' ? signature : undefined,
      request.rawBody,
    );
    if (!valid) {
      this.logger.warn('Rejected Tpay webhook: invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = parseTransactionNotification(request.rawBody!);
    // ACK only after a committed insert (or a database-confirmed duplicate).
    await this.dataSource.transaction((manager) =>
      this.payments.recordVerifiedNotification(manager, event));
    return 'TRUE';
  }
}

function parseTransactionNotification(rawBody: Buffer): VerifiedPaymentNotification {
  const form = new URLSearchParams(rawBody.toString('utf8'));
  if (form.has('event')) throw new BadRequestException('Unsupported notification type');
  const required = (key: string, maxLength: number): string => {
    const values = form.getAll(key);
    if (values.length !== 1 || !values[0] || values[0].length > maxLength) {
      throw new BadRequestException('Invalid transaction notification');
    }
    return values[0];
  };
  const amountMinor = (key: string): number => {
    const value = required(key, 16);
    const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) throw new BadRequestException('Invalid transaction notification');
    const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
    if (!Number.isSafeInteger(amount)) throw new BadRequestException('Invalid transaction notification');
    return amount;
  };

  const merchantReference = required('id', 64);
  if (!/^\d+$/.test(merchantReference)) {
    throw new BadRequestException('Invalid transaction notification');
  }
  const providerReference = required('tr_id', 255);
  const status = required('tr_status', 32);
  if (status !== 'true' && status !== 'chargeback') {
    throw new BadRequestException('Unsupported transaction status');
  }
  const correlationReference = required('tr_crc', 255);
  const currencyValues = form.getAll('tr_currency');
  if (currencyValues.length > 1 || (currencyValues[0] && !/^[A-Z]{3}$/.test(currencyValues[0]))) {
    throw new BadRequestException('Invalid transaction notification');
  }

  return {
    provider: 'tpay',
    eventType: 'transaction',
    providerReference,
    providerStatus: status === 'true' ? 'confirmed' : 'refunded',
    merchantReference,
    correlationReference,
    amountMinor: amountMinor('tr_amount'),
    paidMinor: amountMinor('tr_paid'),
    currency: currencyValues[0] || null,
  };
}
