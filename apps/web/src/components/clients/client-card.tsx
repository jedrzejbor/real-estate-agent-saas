'use client';

import Link from 'next/link';
import { Mail, Phone, Calendar, Wallet } from 'lucide-react';
import { ClientStatusBadge } from './client-status-badge';
import { Badge } from '@/components/ui/badge';
import {
  type Client,
  CLIENT_SOURCE_LABELS,
  SOURCE_BADGE_VARIANT,
  clientFullName,
  clientInitials,
  formatBudgetRange,
  formatRelativeDate,
} from '@/lib/clients';

interface ClientCardProps {
  client: Client;
}

/** Card component displaying a client summary in list/grid views. */
export function ClientCard({ client }: ClientCardProps) {
  const {
    id,
    firstName,
    lastName,
    email,
    phone,
    source,
    status,
    budgetMin,
    budgetMax,
    createdAt,
  } = client;

  const budgetRange = formatBudgetRange(budgetMin, budgetMax);

  return (
    <Link
      href={`/dashboard/clients/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:shadow-md hover:border-primary/20"
    >
      {/* Header with source & status */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <Badge variant={SOURCE_BADGE_VARIANT[source]}>
          {CLIENT_SOURCE_LABELS[source]}
        </Badge>
        <ClientStatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="flex flex-1 items-start gap-4 px-5 py-4">
        {/* Avatar */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {clientInitials({ firstName, lastName })}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name */}
          <h3 className="font-heading text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {clientFullName({ firstName, lastName })}
          </h3>

          {/* Contact info */}
          <div className="space-y-1">
            {email && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3">
        {budgetRange !== '—' ? (
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <Wallet className="h-3.5 w-3.5" />
            <span>{budgetRange}</span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeDate(createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
