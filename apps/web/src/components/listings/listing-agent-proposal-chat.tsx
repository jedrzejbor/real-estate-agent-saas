'use client';

import type { FormEvent } from 'react';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import type {
  ListingAgentProposalMessage,
  ListingAgentProposalParticipantRole,
} from '@/lib/listing-agent-proposals';
import { cn } from '@/lib/utils';

interface ListingAgentProposalChatProps {
  title: string;
  description: string;
  messages: ListingAgentProposalMessage[];
  currentUserRole: ListingAgentProposalParticipantRole;
  messageBody: string;
  canMessage: boolean;
  isSendingMessage: boolean;
  disabledPlaceholder: string;
  enabledPlaceholder: string;
  onMessageBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ListingAgentProposalChat({
  title,
  description,
  messages,
  currentUserRole,
  messageBody,
  canMessage,
  isSendingMessage,
  disabledPlaceholder,
  enabledPlaceholder,
  onMessageBodyChange,
  onSubmit,
}: ListingAgentProposalChatProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
            Nie ma jeszcze wiadomości w tej rozmowie.
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserRole={currentUserRole}
            />
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <textarea
          value={messageBody}
          onChange={(event) => onMessageBodyChange(event.target.value)}
          rows={4}
          maxLength={4000}
          disabled={!canMessage || isSendingMessage}
          placeholder={canMessage ? enabledPlaceholder : disabledPlaceholder}
          className="w-full min-w-0 resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canMessage || !messageBody.trim() || isSendingMessage}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Wyślij
          </button>
        </div>
      </form>
    </section>
  );
}

function MessageBubble({
  message,
  currentUserRole,
}: {
  message: ListingAgentProposalMessage;
  currentUserRole: ListingAgentProposalParticipantRole;
}) {
  const isCurrentUser = message.senderRole === currentUserRole;

  return (
    <article
      className={cn(
        'max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
        isCurrentUser
          ? 'ml-auto border-primary/20 bg-primary/10'
          : 'border-border bg-muted/30',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{isCurrentUser ? 'Ty' : getParticipantLabel(message.senderRole)}</span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      <p className="whitespace-pre-line leading-6">{message.body}</p>
    </article>
  );
}

function getParticipantLabel(role: ListingAgentProposalParticipantRole): string {
  return role === 'owner' ? 'Właściciel' : 'Agent';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
