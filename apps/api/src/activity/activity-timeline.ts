import { ActivityAction, ActivityEntityType } from '../common/enums';

export interface ActivityTimelineActor {
  id: string | null;
  name: string | null;
  email: string | null;
}

export interface ActivityTimelineItem<TType extends string = string> {
  id: string;
  type: TType;
  title: string;
  description: string | null;
  createdAt: string;
  actor: ActivityTimelineActor | null;
  metadata: Record<string, unknown>;
  href: string | null;
}

interface ActivityHistoryTimelineSource {
  id: string;
  entityType: ActivityEntityType;
  action: ActivityAction;
  description?: string | null;
  changes: unknown[];
  createdAt: Date | string;
  actor?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export function mapActivityHistoryToTimelineItem<TType extends string>(
  item: ActivityHistoryTimelineSource,
  type: TType,
): ActivityTimelineItem<TType> {
  return {
    id: `activity:${item.id}`,
    type,
    title: item.description || formatActivityAction(item.action),
    description:
      item.changes.length > 0 ? `Zmieniono pól: ${item.changes.length}` : null,
    createdAt: toActivityIsoString(item.createdAt),
    actor: {
      id: item.actor?.id ?? null,
      name: formatActivityActorName(item.actor),
      email: item.actor?.email ?? null,
    },
    metadata: {
      action: item.action,
      entityType: item.entityType,
      changes: item.changes,
    },
    href: null,
  };
}

export function formatActivityAction(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    [ActivityAction.CREATED]: 'Utworzono',
    [ActivityAction.UPDATED]: 'Zaktualizowano',
    [ActivityAction.STATUS_CHANGED]: 'Zmieniono status',
    [ActivityAction.STATUS_ROLLED_BACK]: 'Cofnięto status',
    [ActivityAction.DELETED]: 'Usunięto',
    [ActivityAction.ARCHIVED]: 'Zarchiwizowano',
    [ActivityAction.PUBLISHED]: 'Opublikowano',
    [ActivityAction.UNPUBLISHED]: 'Cofnięto publikację',
    [ActivityAction.CLAIMED]: 'Przejęto',
    [ActivityAction.NOTE_ADDED]: 'Dodano notatkę',
    [ActivityAction.NOTE_REMOVED]: 'Usunięto notatkę',
  };

  return labels[action] ?? String(action);
}

export function formatActivityActorName(
  actor: ActivityHistoryTimelineSource['actor'],
): string | null {
  if (!actor) {
    return null;
  }

  const fullName = [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || actor.email || null;
}

export function toActivityIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
