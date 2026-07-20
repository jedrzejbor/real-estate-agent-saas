'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  MousePointer2,
  RotateCcw,
  Square,
} from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';
import {
  formatPrice,
  type PublicListingCatalogMapMarker,
  type PublicListingCatalogResponse,
} from '@/lib/listings';
import type { ToggleFavoriteListingResult } from '@/lib/favorite-listings';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { FavoriteListingButton } from '@/components/listings/favorite-listing-button';
import { PublicListingImageCarousel } from '@/components/listings/public-listing-image-carousel';
import type * as Leaflet from 'leaflet';

interface PublicListingCatalogMapProps {
  markers: PublicListingCatalogMapMarker[];
  mapMeta: PublicListingCatalogResponse['meta']['map'];
  activeBbox?: string | null;
  onBboxChange?: (bbox: string | null) => void;
  favoriteListingIds?: ReadonlySet<string>;
  favoriteLoginHref?: string;
  onFavoriteChanged?: (result: ToggleFavoriteListingResult) => void;
}

const DEFAULT_CENTER: [number, number] = [52.0693, 19.4803];
const DEFAULT_ZOOM = 6;
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; OpenStreetMap contributors';
const FALLBACK_LISTING_IMAGE = '/images/hero/house-2.jpg';

export function PublicListingCatalogMap({
  markers,
  mapMeta,
  activeBbox: controlledActiveBbox,
  onBboxChange,
  favoriteListingIds,
  favoriteLoginHref,
  onFavoriteChanged,
}: PublicListingCatalogMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const popupRootsRef = useRef<Root[]>([]);
  const selectionLayerRef = useRef<Leaflet.Rectangle | null>(null);
  const dragStartRef = useRef<Leaflet.LatLng | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [selectedBbox, setSelectedBbox] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBbox = controlledActiveBbox ?? searchParams.get('bbox');

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    void import('leaflet').then((leaflet) => {
      if (!isMounted || !mapContainerRef.current || mapRef.current) {
        return;
      }

      const map = leaflet.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: false,
      });

      leaflet
        .tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
        })
        .addTo(map);

      leafletRef.current = leaflet;
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setIsMapReady(true);
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!leaflet || !map || !markerLayer || !isMapReady) {
      return;
    }

    markerLayer.clearLayers();
    popupRootsRef.current.forEach((root) => root.unmount());
    popupRootsRef.current = [];

    const markerGroups = groupMarkersByPoint(markers);

    for (const markerGroup of markerGroups) {
      const firstMarker = markerGroup.markers[0];
      if (!firstMarker) continue;

      const popupContainer = document.createElement('div');
      const popupRoot = createRoot(popupContainer);
      popupRootsRef.current.push(popupRoot);
      popupRoot.render(
        <MapListingPopup
          markers={markerGroup.markers}
          favoriteListingIds={favoriteListingIds}
          favoriteLoginHref={favoriteLoginHref}
          onFavoriteChanged={onFavoriteChanged}
        />,
      );

      leaflet
        .marker([firstMarker.mapPoint.lat, firstMarker.mapPoint.lng], {
          icon: createMarkerIcon(
            leaflet,
            firstMarker.mapPoint.precision,
            markerGroup.markers.length,
          ),
          keyboard: true,
          title:
            markerGroup.markers.length > 1
              ? `${markerGroup.markers.length} ofert`
              : getMarkerTitle(firstMarker),
        })
        .bindPopup(popupContainer, {
          className: 'podadresem-map-popup',
          maxWidth: 280,
        })
        .addTo(markerLayer);
    }

    const bounds = buildInitialBounds(leaflet, markers, mapMeta.bbox);

    if (bounds?.isValid()) {
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: mapMeta.bbox ? 14 : 12,
      });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }

    return () => {
      popupRootsRef.current.forEach((root) => root.unmount());
      popupRootsRef.current = [];
    };
  }, [
    favoriteListingIds,
    favoriteLoginHref,
    isMapReady,
    mapMeta.bbox,
    markers,
    onFavoriteChanged,
  ]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;

    if (!leaflet || !map || !isMapReady || !isDrawingArea) {
      return;
    }

    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.getContainer().classList.add('podadresem-map-is-drawing');

    const handleMouseDown = (event: Leaflet.LeafletMouseEvent) => {
      dragStartRef.current = event.latlng;
      selectionLayerRef.current?.remove();
      selectionLayerRef.current = leaflet
        .rectangle(leaflet.latLngBounds(event.latlng, event.latlng), {
          color: '#059669',
          fillColor: '#059669',
          fillOpacity: 0.12,
          interactive: false,
          weight: 2,
        })
        .addTo(map);
    };

    const handleMouseMove = (event: Leaflet.LeafletMouseEvent) => {
      if (!dragStartRef.current || !selectionLayerRef.current) {
        return;
      }

      selectionLayerRef.current.setBounds(
        leaflet.latLngBounds(dragStartRef.current, event.latlng),
      );
    };

    const handleMouseUp = (event: Leaflet.LeafletMouseEvent) => {
      if (!dragStartRef.current || !selectionLayerRef.current) {
        return;
      }

      const bounds = leaflet.latLngBounds(dragStartRef.current, event.latlng);
      dragStartRef.current = null;

      if (!isUsableSelection(bounds)) {
        selectionLayerRef.current.remove();
        selectionLayerRef.current = null;
        setSelectedBbox(null);
        return;
      }

      selectionLayerRef.current.setBounds(bounds);
      setSelectedBbox(formatBoundsAsBbox(bounds));
      setIsDrawingArea(false);
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().classList.remove('podadresem-map-is-drawing');
      dragStartRef.current = null;
    };
  }, [isDrawingArea, isMapReady]);

  const startAreaSelection = () => {
    selectionLayerRef.current?.remove();
    selectionLayerRef.current = null;
    setSelectedBbox(null);
    setIsDrawingArea(true);
  };

  const applySelectedBounds = () => {
    if (!selectedBbox) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('bbox', selectedBbox);
    params.set('page', '1');

    trackAnalyticsEvent({
      name: AnalyticsEventName.PUBLIC_LISTING_MAP_SEARCH_USED,
      properties: {
        bbox: selectedBbox,
        markersVisible: markers.length,
        pointsTotal: mapMeta.pointsTotal,
        pointsReturned: mapMeta.pointsReturned,
      },
    });

    if (onBboxChange) {
      onBboxChange(selectedBbox);
      return;
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearSelection = () => {
    selectionLayerRef.current?.remove();
    selectionLayerRef.current = null;
    dragStartRef.current = null;
    setSelectedBbox(null);
    setIsDrawingArea(false);
  };

  const clearBounds = () => {
    clearSelection();

    const params = new URLSearchParams(searchParams.toString());
    params.delete('bbox');
    params.set('page', '1');

    if (onBboxChange) {
      onBboxChange(null);
      return;
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <section
      id="mapa"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="Mapa ofert"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Mapa ofert</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {mapMeta.pointsReturned} z {mapMeta.pointsTotal} punktów na mapie
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedBbox ? (
            <button
              type="button"
              onClick={applySelectedBounds}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              Zastosuj obszar
            </button>
          ) : (
            <button
              type="button"
              onClick={startAreaSelection}
              aria-pressed={isDrawingArea}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isDrawingArea ? (
                <MousePointer2 className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {isDrawingArea ? 'Zaznacz na mapie' : 'Zaznacz obszar'}
            </button>
          )}
          {selectedBbox || isDrawingArea ? (
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Cofnij zaznaczenie
            </button>
          ) : null}
          {activeBbox ? (
            <button
              type="button"
              onClick={clearBounds}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Wyczyść obszar
            </button>
          ) : null}
        </div>
      </div>

      {mapMeta.truncated ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Pokazujemy limit punktów mapy. Zawęź filtry albo obszar, żeby zobaczyć
          dokładniejszy wynik.
        </div>
      ) : null}

      {isDrawingArea ? (
        <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
          Przeciągnij po mapie, żeby zaznaczyć prostokąt wyszukiwania.
        </div>
      ) : null}

      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[420px] w-full bg-muted sm:h-[520px]"
        />

        {markers.length === 0 ? (
          <div className="absolute inset-x-4 top-4 rounded-xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LocateFixed className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Brak punktów do pokazania
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Część ofert może nadal być widoczna na liście, jeśli nie ma
                  bezpiecznej lokalizacji mapowej.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Dokładny punkt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-gold" />
          Lokalizacja przybliżona
        </span>
      </div>
    </section>
  );
}

function buildInitialBounds(
  leaflet: typeof Leaflet,
  markers: PublicListingCatalogMapMarker[],
  bbox: PublicListingCatalogResponse['meta']['map']['bbox'],
) {
  if (bbox) {
    return leaflet.latLngBounds([bbox.south, bbox.west], [bbox.north, bbox.east]);
  }

  if (markers.length > 0) {
    return leaflet.latLngBounds(
      markers.map((marker) => [marker.mapPoint.lat, marker.mapPoint.lng]),
    );
  }

  return null;
}

function isUsableSelection(bounds: Leaflet.LatLngBounds): boolean {
  const width = Math.abs(bounds.getEast() - bounds.getWest());
  const height = Math.abs(bounds.getNorth() - bounds.getSouth());

  return width >= 0.005 && height >= 0.005;
}

function formatBoundsAsBbox(bounds: Leaflet.LatLngBounds): string {
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
    .map((value) => value.toFixed(6))
    .join(',');
}

function createMarkerIcon(
  leaflet: typeof Leaflet,
  precision: 'exact' | 'approximate',
  count = 1,
) {
  const isExact = precision === 'exact';
  const countLabel = count > 1 ? `<strong>${count}</strong>` : '<span></span>';

  return leaflet.divIcon({
    className: '',
    html: `<span class="podadresem-map-marker ${isExact ? 'is-exact' : 'is-approximate'}">${countLabel}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

interface MarkerGroup {
  key: string;
  markers: PublicListingCatalogMapMarker[];
}

function groupMarkersByPoint(
  markers: PublicListingCatalogMapMarker[],
): MarkerGroup[] {
  const groups = new Map<string, PublicListingCatalogMapMarker[]>();

  for (const marker of markers) {
    const key = `${marker.mapPoint.lat.toFixed(6)},${marker.mapPoint.lng.toFixed(6)}`;
    groups.set(key, [...(groups.get(key) ?? []), marker]);
  }

  return Array.from(groups.entries()).map(([key, groupedMarkers]) => ({
    key,
    markers: groupedMarkers,
  }));
}

function MapListingPopup({
  favoriteListingIds,
  favoriteLoginHref,
  markers,
  onFavoriteChanged,
}: {
  favoriteListingIds?: ReadonlySet<string>;
  favoriteLoginHref?: string;
  markers: PublicListingCatalogMapMarker[];
  onFavoriteChanged?: (result: ToggleFavoriteListingResult) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const marker = markers[activeIndex] ?? markers[0];
  if (!marker) return null;

  const location = [marker.address?.district, marker.address?.city]
    .filter(Boolean)
    .join(', ');
  const price = marker.price
    ? formatPrice(marker.price, marker.currency)
    : 'Zapytaj o cenę';
  const precisionLabel = formatMapPointPrecisionLabel(marker);
  const images =
    marker.images && marker.images.length > 0
      ? marker.images
      : marker.primaryImage
        ? [marker.primaryImage]
        : [];
  const hasMultipleListings = markers.length > 1;

  return (
    <article className="podadresem-map-popup-card">
      {hasMultipleListings ? (
        <div className="podadresem-map-popup-switcher">
          <button
            type="button"
            aria-label="Poprzednia oferta w tym punkcie"
            onClick={() =>
              setActiveIndex((current) =>
                current === 0 ? markers.length - 1 : current - 1,
              )
            }
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            Oferta {activeIndex + 1} z {markers.length}
          </span>
          <button
            type="button"
            aria-label="Następna oferta w tym punkcie"
            onClick={() =>
              setActiveIndex((current) => (current + 1) % markers.length)
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <PublicListingImageCarousel
        images={images}
        fallbackImage={FALLBACK_LISTING_IMAGE}
        title={marker.title}
        className="h-28"
        compact
      />
      <div className="absolute right-2 top-2 z-20">
        <FavoriteListingButton
          listingId={marker.id}
          listingSlug={marker.slug}
          initialIsFavorite={favoriteListingIds?.has(marker.id) ?? false}
          variant="compact"
          loginHref={favoriteLoginHref}
          analyticsSource="public_listing_catalog_map_popup"
          stopPropagation
          onChanged={onFavoriteChanged}
          className="h-9 w-9 border-background/80 bg-card/95 shadow-sm backdrop-blur hover:bg-card"
        />
      </div>
      <div className="podadresem-map-popup-body">
        <p className="podadresem-map-popup-price">{price}</p>
        <h3>{marker.title}</h3>
        {location ? (
          <p className="podadresem-map-popup-location">{location}</p>
        ) : null}
        <p className="podadresem-map-popup-precision">{precisionLabel}</p>
        <a href={`/oferty/${encodeURIComponent(marker.slug)}`}>
          Zobacz ofertę
        </a>
      </div>
    </article>
  );
}

function getMarkerTitle(marker: PublicListingCatalogMapMarker): string {
  const precisionLabel = formatMapPointPrecisionLabel(marker);
  return `${marker.title} - ${precisionLabel}`;
}

function formatMapPointPrecisionLabel(
  marker: PublicListingCatalogMapMarker,
): string {
  if (marker.mapPoint.precision === 'exact') {
    return 'Dokładna lokalizacja';
  }

  const label =
    marker.mapPoint.label?.trim() ||
    [marker.address?.district, marker.address?.city].filter(Boolean).join(', ');

  return label
    ? `Lokalizacja przybliżona: ${label}`
    : 'Lokalizacja przybliżona';
}
