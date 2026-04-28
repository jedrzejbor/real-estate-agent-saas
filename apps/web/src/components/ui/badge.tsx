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
          'rounded-full border border-[#059669]/20 bg-[#ECFDF5] px-3 py-1 text-xs text-[#059669]',

        // ── Gold — premium / wyróżnienia ──────────────────────────────
        gold:
          'rounded-full border border-[#D4A853]/25 bg-[#FFF9E6] px-3 py-1 text-xs text-[#B8922F]',

        // ── Muted — neutralne etykiety ────────────────────────────────
        muted:
          'rounded-full border border-[#E7E5E4] bg-[#F5F0EB] px-3 py-1 text-xs text-[#78716C]',

        // ── Status ────────────────────────────────────────────────────
        default:
          'rounded-md border border-transparent bg-primary px-2.5 py-0.5 text-xs text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'rounded-md border border-transparent bg-[#FFF9E6] px-2.5 py-0.5 text-xs text-[#B8922F] [a]:hover:bg-[#FFF9E6]/80',
        success:
          'rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 text-xs text-[#16A34A]',
        warning:
          'rounded-md border border-[#FED7AA] bg-[#FFF7ED] px-2.5 py-0.5 text-xs text-[#EA580C]',
        destructive:
          'rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-xs text-[#DC2626] focus-visible:ring-destructive/20',
        info:
          'rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs text-[#2563EB]',

        // ── Outline / Ghost ───────────────────────────────────────────
        outline:
          'rounded-full border border-[#E7E5E4] bg-white px-3 py-1 text-xs text-[#44403C] [a]:hover:bg-[#F5F0EB]',
        ghost:
          'rounded-md border border-transparent px-2.5 py-0.5 text-xs text-[#78716C] hover:bg-[#F5F0EB]',
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
