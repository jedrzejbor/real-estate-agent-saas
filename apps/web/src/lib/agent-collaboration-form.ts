import type { PublicListingSubmissionAgentCollaboration } from './public-listing-submissions';

export type AgentCollaborationFormValue = {
  enabled: boolean;
  mode: 'single_agent' | 'multi_agent';
  allowsExclusiveAgreement: boolean;
  preferredCommissionType: '' | 'percentage' | 'fixed';
  preferredCommissionValue: string;
  expectedServices: string;
  notes: string;
  preferredContactChannel: 'platform_chat' | 'phone_after_acceptance';
};

export const INITIAL_AGENT_COLLABORATION_FORM_VALUE: AgentCollaborationFormValue =
  {
    enabled: false,
    mode: 'single_agent',
    allowsExclusiveAgreement: false,
    preferredCommissionType: '',
    preferredCommissionValue: '',
    expectedServices: '',
    notes: '',
    preferredContactChannel: 'platform_chat',
  };

export function buildAgentCollaborationPayload(
  value: AgentCollaborationFormValue,
): PublicListingSubmissionAgentCollaboration {
  if (!value.enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    mode: value.mode,
    preferences: {
      allowsExclusiveAgreement: value.allowsExclusiveAgreement,
      allowsMultipleAgents: value.mode === 'multi_agent',
      preferredCommissionType: value.preferredCommissionType || null,
      preferredCommissionValue: optionalNumber(
        value.preferredCommissionValue,
      ),
      expectedServices: splitExpectedServices(value.expectedServices),
      notes: optionalString(value.notes) ?? null,
      preferredContactChannel: value.preferredContactChannel,
    },
  };
}

export function normalizeAgentCollaborationFormValue(
  input: unknown,
): AgentCollaborationFormValue {
  if (!input || typeof input !== 'object') {
    return INITIAL_AGENT_COLLABORATION_FORM_VALUE;
  }

  const collaboration = input as {
    enabled?: unknown;
    mode?: unknown;
    preferences?: Record<string, unknown> | null;
  };
  const preferences = collaboration.preferences ?? {};

  return {
    enabled: Boolean(collaboration.enabled),
    mode:
      collaboration.mode === 'multi_agent' ? 'multi_agent' : 'single_agent',
    allowsExclusiveAgreement: Boolean(
      preferences.allowsExclusiveAgreement,
    ),
    preferredCommissionType:
      preferences.preferredCommissionType === 'percentage' ||
      preferences.preferredCommissionType === 'fixed'
        ? preferences.preferredCommissionType
        : '',
    preferredCommissionValue:
      preferences.preferredCommissionValue === null ||
      preferences.preferredCommissionValue === undefined
        ? ''
        : String(preferences.preferredCommissionValue),
    expectedServices: Array.isArray(preferences.expectedServices)
      ? preferences.expectedServices.filter(Boolean).join(', ')
      : '',
    notes: typeof preferences.notes === 'string' ? preferences.notes : '',
    preferredContactChannel:
      preferences.preferredContactChannel === 'phone_after_acceptance'
        ? 'phone_after_acceptance'
        : 'platform_chat',
  };
}

function splitExpectedServices(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
