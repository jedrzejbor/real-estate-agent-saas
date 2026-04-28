'use client';

import { useState } from 'react';
import { Trash2, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/contexts/confirm-context';
import { useClientNotes } from '@/hooks/use-client-notes';
import { useToast } from '@/contexts/toast-context';
import { cn } from '@/lib/utils';

interface ClientNotesProps {
  clientId: string;
  onHistoryChanged?: () => void;
}

/** Timeline of client notes with add/remove functionality. */
export function ClientNotes({
  clientId,
  onHistoryChanged,
}: ClientNotesProps) {
  const { notes, isLoading, error, isAdding, addNote, removeNote } =
    useClientNotes(clientId);
  const { confirm } = useConfirm();
  const { error: showErrorToast } = useToast();
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    if (trimmed.length > 5000) {
      setFormError('Notatka może mieć maksymalnie 5000 znaków');
      return;
    }

    setFormError(null);
    try {
      await addNote(trimmed);
      setNewContent('');
      onHistoryChanged?.();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Nie udało się dodać notatki',
      );
    }
  };

  const handleRemove = async (noteId: string) => {
    const confirmed = await confirm({
      title: 'Usunąć notatkę?',
      description: 'Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń notatkę',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await removeNote(noteId);
      onHistoryChanged?.();
    } catch (err) {
      showErrorToast({
        title: 'Nie udało się usunąć notatki',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Notatki
      </h2>

      {/* Add note form */}
      <div className="space-y-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          placeholder="Dodaj notatkę o kliencie..."
          className={cn(
            'w-full min-w-0 rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'resize-y',
          )}
        />
        {formError && (
          <p className="text-xs text-destructive">{formError}</p>
        )}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isAdding || !newContent.trim()}
            className="gap-1.5 rounded-xl"
          >
            <Send className="h-3.5 w-3.5" />
            {isAdding ? 'Dodawanie...' : 'Dodaj notatkę'}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Brak notatek. Dodaj pierwszą notatkę o tym kliencie.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-border/80"
            >
              <p className="whitespace-pre-line text-sm text-foreground leading-relaxed pr-8">
                {note.content}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <time
                  dateTime={note.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {new Date(note.createdAt).toLocaleString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <button
                  type="button"
                  onClick={() => handleRemove(note.id)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Usuń notatkę"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
