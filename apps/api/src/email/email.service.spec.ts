import { ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService production delivery', () => {
  it('fails closed when production would only log a verification email', async () => {
    const config = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => {
        if (key === 'NODE_ENV') return 'production';
        return fallback;
      }),
    };
    const service = new EmailService(config as never);

    await expect(
      service.send({
        to: 'owner@example.com',
        subject: 'Potwierdź adres',
        text: 'Jednorazowy link weryfikacyjny',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
