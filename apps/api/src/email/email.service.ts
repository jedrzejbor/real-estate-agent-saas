import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const provider = this.configService.get('EMAIL_PROVIDER', 'log');

    if (provider !== 'log') {
      this.logger.warn(
        `EMAIL_PROVIDER=${provider} is not implemented yet. Falling back to log provider.`,
      );
    }

    this.logger.log(
      `Email queued via log provider: to=${input.to}, subject="${input.subject}"`,
    );
    this.logger.debug(input.text);
  }
}
