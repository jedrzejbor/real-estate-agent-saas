import { BadRequestException } from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { MessageTemplateType } from './message-template.types';

describe('MessageTemplatesService', () => {
  const service = new MessageTemplatesService();

  it('renders a lead response without unresolved placeholders', () => {
    const result = service.render(MessageTemplateType.LEAD_RESPONSE, {
      clientName: 'Anna',
      listingTitle: 'Mieszkanie na Woli',
      leadMessage: 'Czy oferta jest aktualna?',
      agentName: 'Adam Kowal',
      agentPhone: '+48 500 500 500',
    });

    expect(result.subject).toBe('Re: Mieszkanie na Woli');
    expect(result.body).toContain('Dzień dobry Anna');
    expect(result.body).toContain('Czy oferta jest aktualna?');
    expect(result.body).not.toMatch(/{{|}}/);
  });

  it('uses safe fallback values for missing context', () => {
    const result = service.render(MessageTemplateType.APPOINTMENT_CONFIRMATION);

    expect(result.body).toContain('Dzień dobry Pani/Panie');
    expect(result.body).toContain('do potwierdzenia');
    expect(result.body).not.toMatch(/{{|}}/);
  });

  it('rejects unknown template types', () => {
    expect(() => service.render('unknown' as MessageTemplateType)).toThrow(
      BadRequestException,
    );
  });
});
