import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

type EmailProvider = 'log' | 'smtp';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private smtpTransporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const provider = this.configService.get<EmailProvider>('EMAIL_PROVIDER', 'log');

    if (provider === 'smtp') {
      await this.sendViaSmtp(input);
      return;
    }

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

  private async sendViaSmtp(input: SendEmailInput): Promise<void> {
    const from = this.configService.get(
      'SMTP_FROM',
      'Real Estate SaaS <noreply@localhost>',
    );

    await this.getSmtpTransporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    this.logger.log(
      `Email sent via SMTP provider: to=${input.to}, subject="${input.subject}"`,
    );
  }

  private getSmtpTransporter(): Transporter {
    if (this.smtpTransporter) {
      return this.smtpTransporter;
    }

    const host = this.configService.get('SMTP_HOST', 'localhost');
    const port = this.getSmtpPort();
    const secure = this.configService.get('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    this.smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.smtpTransporter;
  }

  private getSmtpPort(): number {
    const rawPort = this.configService.get<string | number>('SMTP_PORT', 1025);
    const port = Number(rawPort);

    return Number.isInteger(port) && port > 0 ? port : 1025;
  }
}
