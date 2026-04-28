'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchClientNotes,
  addClientNote,
  deleteClientNote,
  type ClientNote,
} from '@/lib/clients';

interface UseClientNotesReturn {
  notes: ClientNote[];
  isLoading: boolean;
  error: string | null;
  isAdding: boolean;
  addNote: (content: string) => Promise<void>;
  removeNote: (noteId: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook for managing client notes: fetch, add, remove.
 * Auto-fetches on mount and after mutations.
 */
export function useClientNotes(clientId: string): UseClientNotesReturn {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchClientNotes(clientId);
      setNotes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się pobrać notatek',
      );
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = useCallback(
    async (content: string) => {
      setIsAdding(true);
      try {
        const newNote = await addClientNote(clientId, { content });
        setNotes((prev) => [newNote, ...prev]);
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error('Nie udało się dodać notatki');
      } finally {
        setIsAdding(false);
      }
    },
    [clientId],
  );

  const removeNote = useCallback(
    async (noteId: string) => {
      try {
        await deleteClientNote(clientId, noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error('Nie udało się usunąć notatki');
      }
    },
    [clientId],
  );

  return { notes, isLoading, error, isAdding, addNote, removeNote, refresh: load };
}
