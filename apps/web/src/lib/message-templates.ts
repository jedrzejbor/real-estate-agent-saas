import { apiFetch } from './api-client';

export const MessageTemplateType = {
  LEAD_RESPONSE: 'lead_response',
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  VIEWING_FOLLOW_UP: 'viewing_follow_up',
  DOCUMENT_REQUEST: 'document_request',
  PRICE_CHANGE: 'price_change',
} as const;

export type MessageTemplateType =
  (typeof MessageTemplateType)[keyof typeof MessageTemplateType];

export interface MessageTemplateContext {
  clientName?: string | null;
  listingTitle?: string | null;
  listingAddress?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  price?: string | null;
  previousPrice?: string | null;
  documentList?: string | null;
  leadMessage?: string | null;
}

export interface MessageTemplateDefinition {
  type: MessageTemplateType;
  label: string;
  description: string;
  requiredContext: Array<keyof MessageTemplateContext>;
  subject: string;
  body: string;
}

export interface RenderedMessageTemplate {
  type: MessageTemplateType;
  label: string;
  subject: string;
  body: string;
}

export async function fetchMessageTemplates(): Promise<
  MessageTemplateDefinition[]
> {
  return apiFetch<MessageTemplateDefinition[]>('/message-templates');
}

export async function renderMessageTemplate(input: {
  type: MessageTemplateType;
  context?: MessageTemplateContext;
}): Promise<RenderedMessageTemplate> {
  return apiFetch<RenderedMessageTemplate>('/message-templates/render', {
    method: 'POST',
    body: input,
  });
}
