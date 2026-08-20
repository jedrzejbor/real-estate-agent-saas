'use client';

import { Handshake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AgentCollaborationFormValue } from '@/lib/agent-collaboration-form';
import { cn } from '@/lib/utils';

export {
  buildAgentCollaborationPayload,
  INITIAL_AGENT_COLLABORATION_FORM_VALUE,
  normalizeAgentCollaborationFormValue,
  type AgentCollaborationFormValue,
} from '@/lib/agent-collaboration-form';

interface AgentCollaborationFieldsProps {
  value: AgentCollaborationFormValue;
  onChange: (value: AgentCollaborationFormValue) => void;
  className?: string;
  description?: string;
  showEnabledToggle?: boolean;
  surface?: 'card' | 'plain';
}

export function AgentCollaborationFields({
  value,
  onChange,
  className,
  description = 'Po publikacji agenci z płatnym planem będą mogli wysłać propozycję współpracy dla tej oferty.',
  showEnabledToggle = true,
  surface = 'card',
}: AgentCollaborationFieldsProps) {
  const fieldsVisible = showEnabledToggle ? value.enabled : true;

  function update<K extends keyof AgentCollaborationFormValue>(
    key: K,
    nextValue: AgentCollaborationFormValue[K],
  ) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <section
      className={cn(
        surface === 'card'
          ? 'rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'
          : 'p-0',
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Handshake className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Współpraca z agentami
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {showEnabledToggle ? (
        <label className="mt-5 flex gap-3 rounded-xl border border-border bg-muted/20 p-3">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Jestem otwarty na przejęcie prowadzenia oferty przez agenta
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Publicznie pokażemy tylko informację, że właściciel szuka agenta.
              Szczegóły współpracy będą widoczne w propozycjach i czacie.
            </span>
          </span>
        </label>
      ) : null}

      {fieldsVisible ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Model współpracy
            </span>
            <select
              value={value.mode}
              onChange={(event) =>
                update(
                  'mode',
                  event.target.value as AgentCollaborationFormValue['mode'],
                )
              }
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="single_agent">Chcę wybrać jednego agenta</option>
              <option value="multi_agent">Dopuszczam kilku agentów</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Kontakt przed akceptacją
            </span>
            <select
              value={value.preferredContactChannel}
              onChange={(event) =>
                update(
                  'preferredContactChannel',
                  event.target
                    .value as AgentCollaborationFormValue['preferredContactChannel'],
                )
              }
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="platform_chat">Czat na platformie</option>
              <option value="phone_after_acceptance">
                Telefon dopiero po akceptacji
              </option>
            </select>
          </label>

          <label className="flex gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={value.allowsExclusiveAgreement}
              onChange={(event) =>
                update('allowsExclusiveAgreement', event.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Dopuszczam rozmowę o umowie na wyłączność
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Preferowany typ prowizji
            </span>
            <select
              value={value.preferredCommissionType}
              onChange={(event) =>
                update(
                  'preferredCommissionType',
                  event.target
                    .value as AgentCollaborationFormValue['preferredCommissionType'],
                )
              }
              className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Do uzgodnienia</option>
              <option value="percentage">Procent od transakcji</option>
              <option value="fixed">Stała kwota</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Preferowana wartość prowizji
            </span>
            <Input
              type="number"
              min="0"
              value={value.preferredCommissionValue}
              onChange={(event) =>
                update('preferredCommissionValue', event.target.value)
              }
              className="h-10 rounded-xl"
              placeholder="np. 2 albo 8000"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">
              Oczekiwane usługi
            </span>
            <textarea
              value={value.expectedServices}
              onChange={(event) => update('expectedServices', event.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full min-w-0 resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="np. wycena, zdjęcia, home staging, publikacja na portalach, obsługa prezentacji"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">
              Dodatkowe oczekiwania
            </span>
            <textarea
              value={value.notes}
              onChange={(event) => update('notes', event.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full min-w-0 resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Np. zależy mi na szybkim starcie, lokalnej znajomości rynku albo konkretnej strategii promocji."
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
