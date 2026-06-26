'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, MessageSquareText, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/toast-context';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  fetchMessageTemplates,
  MessageTemplateType,
  renderMessageTemplate,
  type MessageTemplateContext,
  type MessageTemplateDefinition,
  type RenderedMessageTemplate,
} from '@/lib/message-templates';

interface MessageTemplateDialogProps {
  isOpen: boolean;
  title?: string;
  initialTemplateType?: MessageTemplateType;
  context: MessageTemplateContext;
  onClose: () => void;
}

export function MessageTemplateDialog({
  isOpen,
  title = 'Wiadomość',
  initialTemplateType = MessageTemplateType.LEAD_RESPONSE,
  context,
  onClose,
}: MessageTemplateDialogProps) {
  const { success, error: showError } = useToast();
  const [templates, setTemplates] = useState<MessageTemplateDefinition[]>([]);
  const [selectedType, setSelectedType] =
    useState<MessageTemplateType>(initialTemplateType);
  const [rendered, setRendered] = useState<RenderedMessageTemplate | null>(
    null,
  );
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType) ?? null,
    [selectedType, templates],
  );

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setError(null);

    try {
      const result = await fetchMessageTemplates();
      setTemplates(result);
      setSelectedType((currentType) =>
        result.some((template) => template.type === currentType)
          ? currentType
          : (result[0]?.type ?? initialTemplateType),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać szablonów wiadomości',
      );
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [initialTemplateType]);

  const renderSelectedTemplate = useCallback(async () => {
    setIsRendering(true);
    setError(null);

    try {
      setRendered(
        await renderMessageTemplate({
          type: selectedType,
          context,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się przygotować wiadomości',
      );
    } finally {
      setIsRendering(false);
    }
  }, [context, selectedType]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedType(initialTemplateType);
    void loadTemplates();
  }, [initialTemplateType, isOpen, loadTemplates]);

  useEffect(() => {
    if (!isOpen) return;
    void renderSelectedTemplate();
  }, [isOpen, renderSelectedTemplate]);

  async function handleCopy() {
    if (!rendered) return;

    try {
      await copyTextToClipboard(
        [`Temat: ${rendered.subject}`, '', rendered.body].join('\n'),
      );
      success({
        title: 'Wiadomość skopiowana',
        description: 'Treść jest gotowa do wklejenia w emailu albo SMS.',
      });
    } catch (err) {
      showError({
        title: 'Nie udało się skopiować',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-template-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <h2
                id="message-template-title"
                className="font-heading text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Wybierz szablon, sprawdź podgląd i skopiuj gotową treść.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Zamknij"
            className="h-9 w-9 rounded-xl"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid max-h-[calc(90vh-88px)] gap-0 overflow-y-auto lg:grid-cols-[260px_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Szablony
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={loadTemplates}
                disabled={isLoadingTemplates}
                aria-label="Odśwież szablony"
                className="h-8 w-8 rounded-xl"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isLoadingTemplates ? 'animate-spin' : ''
                  }`}
                />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  onClick={() => setSelectedType(template.type)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selectedType === template.type
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {template.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5">
                    {template.description}
                  </span>
                </button>
              ))}

              {templates.length === 0 && !isLoadingTemplates ? (
                <p className="rounded-xl border border-border/70 bg-muted/10 p-3 text-sm text-muted-foreground">
                  Brak dostępnych szablonów.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 p-5">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {selectedTemplate ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedTemplate.label}</Badge>
                {selectedTemplate.requiredContext.map((field) => (
                  <Badge key={field} variant="outline">
                    {field}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Temat
              </label>
              <div className="rounded-xl border border-border/80 bg-muted/10 px-3 py-2 text-sm text-foreground">
                {rendered?.subject ??
                  (isRendering ? 'Przygotowywanie...' : '—')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Treść
              </label>
              <textarea
                readOnly
                value={rendered?.body ?? ''}
                placeholder={isRendering ? 'Przygotowywanie...' : 'Brak treści'}
                className="min-h-[320px] w-full resize-y rounded-xl border border-border/80 bg-muted/10 px-3 py-2 text-sm leading-6 text-foreground outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl"
              >
                Zamknij
              </Button>
              <Button
                type="button"
                onClick={handleCopy}
                disabled={!rendered || isRendering}
                className="gap-2 rounded-xl"
              >
                <Copy className="h-4 w-4" />
                Kopiuj wiadomość
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
