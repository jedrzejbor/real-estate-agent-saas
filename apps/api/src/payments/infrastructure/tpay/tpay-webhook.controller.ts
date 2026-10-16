import {
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
import { Request } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { TpayJwsVerifier } from './tpay-jws.verifier';

/** Transport only. Do not configure production notifications until durable processing exists. */
@Controller('payments/webhooks')
export class TpayWebhookController {
  private readonly logger = new Logger(TpayWebhookController.name);

  constructor(private readonly verifier: TpayJwsVerifier) {}

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

    // No business parsing, Payment write or entitlement grant in PAY-026.
    return 'TRUE';
  }
}
