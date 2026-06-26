import { BadRequestException, Injectable } from '@nestjs/common';
import { MESSAGE_TEMPLATES } from './message-template.catalog';
import {
  MessageTemplateContext,
  MessageTemplateDefinition,
  MessageTemplateType,
  RenderedMessageTemplate,
} from './message-template.types';

@Injectable()
export class MessageTemplatesService {
  findAll(): MessageTemplateDefinition[] {
    return MESSAGE_TEMPLATES;
  }

  render(
    type: MessageTemplateType,
    context: MessageTemplateContext = {},
  ): RenderedMessageTemplate {
    const template = MESSAGE_TEMPLATES.find((item) => item.type === type);

    if (!template) {
      throw new BadRequestException('Nieznany typ szablonu wiadomości');
    }

    const values = this.buildRenderValues(context);
    const subject = this.interpolate(template.subject, values);
    const body = this.compactMessage(this.interpolate(template.body, values));

    return {
      type: template.type,
      label: template.label,
      subject,
      body,
    };
  }

  private buildRenderValues(
    context: MessageTemplateContext,
  ): Record<string, string> {
    const clientName = cleanValue(context.clientName) || 'Pani/Panie';
    const listingTitle = cleanValue(context.listingTitle) || 'wybranej oferty';
    const agentName = cleanValue(context.agentName) || 'Agent nieruchomości';
    const agentContact = [context.agentPhone, context.agentEmail]
      .map(cleanValue)
      .filter(Boolean)
      .join(' · ');
    const leadMessage = cleanValue(context.leadMessage);
    const previousPrice = cleanValue(context.previousPrice);

    return {
      clientName,
      listingTitle,
      listingAddress: cleanValue(context.listingAddress) || 'do potwierdzenia',
      appointmentDate:
        cleanValue(context.appointmentDate) || 'do potwierdzenia',
      appointmentTime:
        cleanValue(context.appointmentTime) || 'do potwierdzenia',
      agentName,
      agentContact: agentContact || 'kontakt w stopce wiadomości',
      price: cleanValue(context.price) || 'do potwierdzenia',
      documentList:
        cleanValue(context.documentList) ||
        '- dokument potwierdzający własność\n- świadectwo energetyczne, jeśli jest dostępne',
      leadReference: leadMessage
        ? `Odnosząc się do wiadomości: "${leadMessage}"`
        : '',
      previousPriceLine: previousPrice
        ? `Poprzednia cena: ${previousPrice}.`
        : '',
    };
  }

  private interpolate(
    template: string,
    values: Record<string, string>,
  ): string {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
      const value = values[key];
      return typeof value === 'string' ? value : '';
    });
  }

  private compactMessage(value: string): string {
    return value
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

function cleanValue(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}
