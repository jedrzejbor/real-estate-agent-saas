import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        // ── Brand (emerald) — sekcje / labele ─────────────────────────
        brand:
          'rounded-full border border-primary/20 bg-brand-emerald-light px-3 py-1 text-xs text-primary',

        // ── Gold — premium / wyróżnienia ──────────────────────────────
        gold:
          'rounded-full border border-brand-gold/25 bg-brand-gold-light px-3 py-1 text-xs text-brand-gold-dark',

        // ── Muted — neutralne etykiety ────────────────────────────────
        muted:
          'rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground',

        // ── Status ────────────────────────────────────────────────────
        default:
          'rounded-md border border-transparent bg-primary px-2.5 py-0.5 text-xs text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'rounded-md border border-transparent bg-brand-gold-light px-2.5 py-0.5 text-xs text-brand-gold-dark [a]:hover:bg-brand-gold-light/80',
        success:
          'rounded-md border border-status-success/25 bg-status-success-bg px-2.5 py-0.5 text-xs text-status-success',
        warning:
          'rounded-md border border-status-warning/25 bg-status-warning-bg px-2.5 py-0.5 text-xs text-status-warning',
        destructive:
          'rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive focus-visible:ring-destructive/20',
        info:
          'rounded-md border border-status-info/25 bg-status-info-bg px-2.5 py-0.5 text-xs text-status-info',

        // ── Outline / Ghost ───────────────────────────────────────────
        outline:
          'rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground [a]:hover:bg-muted',
        ghost:
          'rounded-md border border-transparent px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
