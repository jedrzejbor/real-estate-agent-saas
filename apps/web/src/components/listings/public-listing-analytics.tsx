'use client';

import * as React from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsEventName, trackPublicListingEvent } from '@/lib/analytics';
import { ListingQrAsset } from './listing-qr-asset';

interface PublicListingAnalyticsProps {
  slug: string;
  listingId: string;
  title: string;
  url: string;
}

export function PublicListingAnalytics({
  slug,
  listingId,
  title,
  url,
}: PublicListingAnalyticsProps) {
  const hasTrackedView = React.useRef(false);
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;

    trackPublicListingEvent({
      slug,
      name: AnalyticsEventName.PUBLIC_LISTING_VIEWED,
      properties: {
        funnelStage: 'visit',
        listingId,
        publicSlug: slug,
      },
    });
  }, [listingId, slug]);

  async function handleShare() {
    const canUseNativeShare = typeof navigator.share === 'function';

    trackPublicListingEvent({
      slug,
      name: AnalyticsEventName.PUBLIC_LISTING_SHARE_CLICKED,
      properties: {
        funnelStage: 'share',
        listingId,
        publicSlug: slug,
        method: canUseNativeShare ? 'native_share' : 'copy_fallback',
      },
    });

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      } catch {
        return;
      }
    }

    await copyUrl();
  }

  async function handleCopy() {
    await copyUrl();
  }

  function handleQrDownload() {
    trackPublicListingEvent({
      slug,
      name: AnalyticsEventName.PUBLIC_LISTING_SHARE_CLICKED,
      properties: {
        funnelStage: 'share',
        listingId,
        publicSlug: slug,
        method: 'qr_download',
        source: 'public_listing_page',
      },
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);

      trackPublicListingEvent({
        slug,
        name: AnalyticsEventName.PUBLIC_LISTING_LINK_COPIED,
        properties: {
          funnelStage: 'share',
          listingId,
          publicSlug: slug,
          source: 'public_listing_page',
        },
      });
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleShare}
          className="h-11 gap-2 rounded-xl"
        >
          <Share2 className="h-4 w-4" />
          Udostępnij
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="h-11 gap-2 rounded-xl"
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {isCopied ? 'Skopiowano' : 'Kopiuj link'}
        </Button>
      </div>
      <ListingQrAsset
        url={url}
        title={title}
        downloadFileName={`estateflow-${slug}-qr.png`}
        onDownload={handleQrDownload}
      />
    </div>
  );
}
