'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  RadioTower,
  Save,
  Share2,
} from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { ListingQrAsset } from './listing-qr-asset';
import {
  LISTING_PUBLICATION_STATUS_LABELS,
  ListingPublicationStatus,
  publicListingSettingsSchema,
  publishListing,
  type Listing,
  type PublicListingSettingsFormData,
  unpublishListing,
  updatePublicListingSettings,
} from '@/lib/listings';

interface ListingPublicationPanelProps {
  listing: Listing;
  onListingChange?: (listing: Listing) => void;
  density?: 'default' | 'compact';
}

type FieldErrors = Partial<Record<keyof PublicListingSettingsFormData, string>>;

const STATUS_BADGE_VARIANT: Record<
  ListingPublicationStatus,
  'success' | 'warning' | 'secondary'
> = {
  draft: 'secondary',
  published: 'success',
  unpublished: 'warning',
};

export function ListingPublicationPanel({
  listing,
  onListingChange,
  density = 'default',
}: ListingPublicationPanelProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [origin, setOrigin] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const isPublished =
    listing.publicationStatus === ListingPublicationStatus.PUBLISHED;
  const isCompact = density === 'compact';
  const publicPath = listing.publicSlug ? `/oferty/${listing.publicSlug}` : '';
  const publicUrl = origin && publicPath ? `${origin}${publicPath}` : '';

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload: PublicListingSettingsFormData = {
      publicTitle: String(formData.get('publicTitle') ?? ''),
      publicDescription: String(formData.get('publicDescription') ?? ''),
      seoTitle: String(formData.get('seoTitle') ?? ''),
      seoDescription: String(formData.get('seoDescription') ?? ''),
      shareImageUrl: String(formData.get('shareImageUrl') ?? ''),
      showPriceOnPublicPage: formData.get('showPriceOnPublicPage') === 'on',
      showExactAddressOnPublicPage:
        formData.get('showExactAddressOnPublicPage') === 'on',
    };

    const parsed = publicListingSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updatePublicListingSettings(
        listing.id,
        parsed.data,
      );
      onListingChange?.(updated);
      showSuccessToast({
        title: 'Ustawienia publikacji zapisane',
        description: isPublished
          ? 'Publiczna strona używa już nowych danych.'
          : 'Dane są gotowe do publikacji oferty.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać ustawień',
        description:
          error instanceof Error
            ? error.message
            : 'Spróbuj ponownie za chwilę.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublicationToggle() {
    try {
      setIsPublishing(true);
      const updated = isPublished
        ? await unpublishListing(listing.id)
        : await publishListing(listing.id);
      onListingChange?.(updated);
      showSuccessToast({
        title: isPublished ? 'Oferta wyłączona' : 'Oferta opublikowana',
        description: isPublished
          ? 'Publiczny link nie będzie już dostępny dla klientów.'
          : 'Możesz teraz skopiować link i udostępnić ofertę.',
      });
    } catch (error) {
      showErrorToast({
        title: isPublished
          ? 'Nie udało się wyłączyć publikacji'
          : 'Nie udało się opublikować oferty',
        description:
          error instanceof Error
            ? error.message
            : 'Spróbuj ponownie za chwilę.',
      });
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCopyUrl() {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
      trackAnalyticsEvent({
        name: AnalyticsEventName.PUBLIC_LISTING_LINK_COPIED,
        properties: {
          listingId: listing.id,
          publicSlug: listing.publicSlug ?? null,
          source: 'agent_publication_panel',
        },
      });
      showSuccessToast({
        title: 'Link skopiowany',
        description: 'Publiczny adres oferty jest w schowku.',
      });
    } catch {
      showErrorToast({
        title: 'Nie udało się skopiować linku',
        description: 'Zaznacz adres ręcznie i skopiuj go z pola.',
      });
    }
  }

  async function handleShareUrl() {
    if (!publicUrl) return;

    const canUseNativeShare = typeof navigator.share === 'function';
    trackAnalyticsEvent({
      name: AnalyticsEventName.PUBLIC_LISTING_SHARE_CLICKED,
      properties: {
        listingId: listing.id,
        publicSlug: listing.publicSlug ?? null,
        source: 'agent_publication_panel',
        method: canUseNativeShare ? 'native_share' : 'copy_fallback',
      },
    });

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: listing.publicTitle || listing.title,
          text: listing.publicTitle || listing.title,
          url: publicUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await handleCopyUrl();
  }

  function handleQrDownload() {
    trackAnalyticsEvent({
      name: AnalyticsEventName.PUBLIC_LISTING_SHARE_CLICKED,
      properties: {
        listingId: listing.id,
        publicSlug: listing.publicSlug ?? null,
        source: 'agent_publication_panel',
        method: 'qr_download',
      },
    });
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-white shadow-sm',
        density === 'compact' ? 'p-5' : 'p-6',
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-4',
          isCompact ? '' : 'sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Publikacja oferty
            </h2>
            <Badge variant={STATUS_BADGE_VARIANT[listing.publicationStatus]}>
              {LISTING_PUBLICATION_STATUS_LABELS[listing.publicationStatus]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Zarządzaj publiczną kartą oferty, linkiem do udostępniania i
            widocznością danych dla klientów.
          </p>
        </div>
        <Button
          type="button"
          variant={isPublished ? 'outline' : 'default'}
          onClick={handlePublicationToggle}
          disabled={isPublishing || isSaving}
          className={cn(
            'gap-2 rounded-xl',
            isCompact ? 'w-full' : 'sm:self-start',
          )}
        >
          {isPublished ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <RadioTower className="h-4 w-4" />
          )}
          {isPublishing
            ? 'Przetwarzanie...'
            : isPublished
              ? 'Wyłącz publikację'
              : 'Opublikuj'}
        </Button>
      </div>

      <div
        className={cn(
          'mt-5 grid gap-4',
          isCompact ? '' : 'xl:grid-cols-[minmax(0,1fr)_190px]',
        )}
      >
        <div className="space-y-3">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="public-url"
          >
            Publiczny link
          </label>
          <div className="space-y-2">
            <div className="relative min-w-0">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="public-url"
                value={publicUrl || 'Link pojawi się po publikacji'}
                readOnly
                className="h-10 rounded-xl pl-9 text-sm"
              />
            </div>
            <div
              className={cn('grid gap-2', isCompact ? '' : 'sm:grid-cols-3')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyUrl}
                disabled={!publicUrl}
                className="w-full gap-2 rounded-xl"
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {isCopied ? 'Skopiowano' : 'Kopiuj'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleShareUrl}
                disabled={!publicUrl}
                className="w-full gap-2 rounded-xl"
              >
                <Share2 className="h-4 w-4" />
                Udostępnij
              </Button>
              {publicPath ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  render={
                    <Link href={publicPath} target="_blank" rel="noreferrer" />
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Podgląd
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-full gap-2 rounded-xl"
                >
                  <Eye className="h-4 w-4" />
                  Podgląd
                </Button>
              )}
            </div>
          </div>
        </div>

        <ListingQrAsset
          url={publicUrl}
          title={listing.publicTitle || listing.title}
          disabled={!isPublished || !publicUrl}
          downloadFileName={`estateflow-${listing.publicSlug ?? listing.id}-qr.png`}
          onDownload={handleQrDownload}
        />
      </div>

      <form
        key={`${listing.id}-${listing.updatedAt}-${listing.publicationStatus}`}
        onSubmit={handleSettingsSubmit}
        className="mt-6 space-y-5"
      >
        <div className={cn('grid gap-4', isCompact ? '' : 'md:grid-cols-2')}>
          <PublicationField
            label="Publiczny tytuł"
            name="publicTitle"
            error={fieldErrors.publicTitle}
          >
            <Input
              id="publicTitle"
              name="publicTitle"
              defaultValue={listing.publicTitle ?? ''}
              placeholder={listing.title}
              maxLength={255}
              className="h-10 rounded-xl"
            />
          </PublicationField>

          <PublicationField
            label="Zdjęcie do udostępniania"
            name="shareImageUrl"
            error={fieldErrors.shareImageUrl}
          >
            <Input
              id="shareImageUrl"
              name="shareImageUrl"
              defaultValue={listing.shareImageUrl ?? ''}
              placeholder="https://..."
              maxLength={500}
              className="h-10 rounded-xl"
            />
          </PublicationField>

          <PublicationField
            label="SEO title"
            name="seoTitle"
            error={fieldErrors.seoTitle}
          >
            <Input
              id="seoTitle"
              name="seoTitle"
              defaultValue={listing.seoTitle ?? ''}
              placeholder="Do 70 znaków"
              maxLength={70}
              className="h-10 rounded-xl"
            />
          </PublicationField>

          <PublicationField
            label="SEO description"
            name="seoDescription"
            error={fieldErrors.seoDescription}
          >
            <Input
              id="seoDescription"
              name="seoDescription"
              defaultValue={listing.seoDescription ?? ''}
              placeholder="Do 180 znaków"
              maxLength={180}
              className="h-10 rounded-xl"
            />
          </PublicationField>

          <PublicationField
            label="Publiczny opis"
            name="publicDescription"
            error={fieldErrors.publicDescription}
            className={cn(isCompact ? '' : 'md:col-span-2')}
          >
            <textarea
              id="publicDescription"
              name="publicDescription"
              defaultValue={listing.publicDescription ?? ''}
              rows={4}
              placeholder="Jeśli zostawisz puste, strona użyje opisu z oferty."
              className={cn(
                'w-full min-w-0 resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
                'placeholder:text-muted-foreground',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            />
          </PublicationField>
        </div>

        <div className={cn('grid gap-3', isCompact ? '' : 'md:grid-cols-2')}>
          <CheckboxOption
            name="showPriceOnPublicPage"
            defaultChecked={listing.showPriceOnPublicPage}
            label="Pokazuj cenę na stronie publicznej"
            description="Wyłącz, jeśli chcesz prowadzić rozmowę cenową dopiero po kontakcie."
          />
          <CheckboxOption
            name="showExactAddressOnPublicPage"
            defaultChecked={listing.showExactAddressOnPublicPage}
            label="Pokazuj dokładny adres"
            description="Po wyłączeniu klienci zobaczą tylko miasto i dzielnicę."
          />
        </div>

        {listing.estateflowBrandingEnabled ? (
          <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Branding EstateFlow jest aktywny dla tej oferty. Konta z własnym
            brandingiem mogą go ukrywać automatycznie po publikacji.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving || isPublishing}
            className="gap-2 rounded-xl"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PublicationField({
  label,
  name,
  error,
  className,
  children,
}: {
  label: string;
  name: keyof PublicListingSettingsFormData;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckboxOption({
  name,
  defaultChecked,
  label,
  description,
}: {
  name: keyof Pick<
    PublicListingSettingsFormData,
    'showPriceOnPublicPage' | 'showExactAddressOnPublicPage'
  >;
  defaultChecked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex gap-3 rounded-xl border border-border bg-white p-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
      />
      <span>
        <span className="block font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function mapZodErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof PublicListingSettingsFormData;
    if (field) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
