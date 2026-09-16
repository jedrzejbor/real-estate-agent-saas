import { CalendarDays, Check, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatListingProductPrice,
  LISTING_PRODUCT_TYPE_LABELS,
  parsePricePreview,
  type ListingProductFormValues,
  type PublicListingProduct,
} from '@/lib/listing-products';
import { cn } from '@/lib/utils';

type ListingProductPreviewCardProps =
  | {
      product: PublicListingProduct;
      draft?: never;
      isVisible?: boolean;
      preview?: boolean;
      cta?: ListingProductCardCta;
      className?: string;
    }
  | {
      product?: never;
      draft: ListingProductFormValues;
      isVisible?: boolean;
      preview?: boolean;
      cta?: ListingProductCardCta;
      className?: string;
    };

interface ListingProductCardCta {
  label: string;
  href: string;
  onClick?: () => void;
}

/** Shared product presentation for the admin preview and the public pricing UI. */
export function ListingProductPreviewCard(
  props: ListingProductPreviewCardProps,
) {
  const product = toPreviewProduct(props);

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm',
        product.type === 'featured' && 'border-brand-gold/40',
        props.className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-brand-gold to-primary" />
      <div className="flex items-start justify-between gap-3">
        <Badge variant={product.type === 'featured' ? 'gold' : 'brand'}>
          {LISTING_PRODUCT_TYPE_LABELS[product.type]}
        </Badge>
        {props.isVisible === false ? (
          <Badge variant="muted" className="gap-1">
            <EyeOff className="h-3 w-3" />
            Niewidoczny
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">
        {product.name || 'Nazwa produktu'}
      </h3>
      <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
        {product.description || 'Opis korzyści widoczny dla klienta.'}
      </p>

      <div className="mt-6">
        {product.promotionPreview ? (
          <Badge variant="gold" className="mb-2">
            {product.promotionPreview.label}
          </Badge>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          {product.promotionPreview ? (
            <span className="pb-1 text-sm text-muted-foreground line-through">
              {formatListingProductPrice(product.priceGrossAmount ?? 0, 'PLN')}
            </span>
          ) : null}
          <span className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {product.displayPriceGrossAmount === null
              ? '—'
              : formatListingProductPrice(product.displayPriceGrossAmount, 'PLN')}
          </span>
          <span className="pb-1 text-xs text-muted-foreground">brutto</span>
        </div>
        {product.promotionPreview ? (
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Oszczędzasz{' '}
            {formatListingProductPrice(
              product.promotionPreview.discountGrossAmount,
              'PLN',
            )}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>
            Czas działania:{' '}
            <strong>{product.durationDays || '—'} dni</strong>
          </span>
        </div>
        {product.featuredTier ? (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-gold-dark" />
            <span>
              Poziom wyróżnienia: <strong>{product.featuredTier}</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-status-success" />
            <span>Jednorazowa opłata bez abonamentu</span>
          </div>
        )}
      </div>

      {props.cta ? (
        <Button
          className="mt-6 h-10 w-full rounded-xl"
          render={<Link href={props.cta.href} onClick={props.cta.onClick} />}
        >
          {props.cta.label}
        </Button>
      ) : props.preview ? (
        <>
          <button
            type="button"
            disabled
            className="mt-6 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground opacity-70"
          >
            Wybierz produkt
          </button>
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
            Podgląd — zakup zostanie podłączony w kolejnym etapie
          </p>
        </>
      ) : null}
    </article>
  );
}

function toPreviewProduct(props: ListingProductPreviewCardProps): {
  name: string;
  description: string;
  type: ListingProductFormValues['type'];
  priceGrossAmount: number | null;
  displayPriceGrossAmount: number | null;
  promotionPreview: PublicListingProduct['promotionPreview'];
  durationDays: string;
  featuredTier: string;
} {
  if (props.product) {
    return {
      name: props.product.name,
      description: props.product.description ?? '',
      type: props.product.type,
      priceGrossAmount: props.product.priceGrossAmount,
      displayPriceGrossAmount:
        props.product.promotionPreview?.priceGrossAmount ??
        props.product.priceGrossAmount,
      promotionPreview: props.product.promotionPreview,
      durationDays: String(props.product.durationDays),
      featuredTier: props.product.featuredTier ?? '',
    };
  }

  const priceGrossAmount = parsePricePreview(props.draft.priceGrossPln);

  return {
    name: props.draft.name,
    description: props.draft.description,
    type: props.draft.type,
    priceGrossAmount,
    displayPriceGrossAmount: priceGrossAmount,
    promotionPreview: null,
    durationDays: props.draft.durationDays,
    featuredTier: props.draft.featuredTier,
  };
}
