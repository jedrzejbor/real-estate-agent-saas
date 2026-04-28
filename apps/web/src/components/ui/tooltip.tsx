'use client';

import * as React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

// ── Tooltip ──
// Thin wrapper around @base-ui/react Tooltip for use across the app.

export interface TooltipProps {
  /** The trigger element */
  children: React.ReactNode;
  /** Tooltip content */
  content: React.ReactNode;
  /** Delay before tooltip appears (ms) */
  delay?: number;
}

export function Tooltip({ children, content, delay = 400 }: TooltipProps) {
  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children as React.ReactElement} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner sideOffset={8} side="top" align="center">
            <BaseTooltip.Popup
              className={cn(
                'z-50 max-w-xs rounded-xl border border-border bg-foreground px-3 py-2 text-xs text-background shadow-md',
                'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              )}
            >
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}
