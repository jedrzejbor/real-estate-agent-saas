'use client';

import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { copyTextToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const { error, success } = useToast();

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(value);
      success({
        title: 'Skopiowano',
        description: `${label} skopiowano do schowka.`,
      });
    } catch {
      error({
        title: 'Nie udało się skopiować',
        description:
          'Skopiuj wartość ręcznie albo sprawdź uprawnienia przeglądarki.',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleCopy}
      className={cn('shrink-0', className)}
      aria-label={`Kopiuj ${label.toLowerCase()}`}
      title={`Kopiuj ${label.toLowerCase()}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}
