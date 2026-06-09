'use client';

import * as React from 'react';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchLocations, type LocationSuggestion } from '@/lib/locations';
import { cn } from '@/lib/utils';

interface CityAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onLocationSelect?: (location: LocationSuggestion) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  name?: string;
  defaultLocation?: {
    lat?: number | string | null;
    lng?: number | string | null;
    voivodeship?: string | null;
  };
  hiddenFieldPrefix?: string;
}

export function CityAutocomplete({
  value,
  onValueChange,
  onLocationSelect,
  error,
  placeholder = 'np. Warszawa',
  className,
  inputClassName,
  name,
  defaultLocation,
  hiddenFieldPrefix,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>(
    [],
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [selectedLocation, setSelectedLocation] =
    React.useState<LocationSuggestion | null>(null);
  const cacheRef = React.useRef<Map<string, LocationSuggestion[]>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const normalizedQuery = normalizeQuery(query);
    const cached = cacheRef.current.get(normalizedQuery);
    if (cached) {
      setSuggestions(cached);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await searchLocations(query, 8);

        if (!controller.signal.aborted) {
          cacheRef.current.set(normalizedQuery, results);
          setSuggestions(results);
          setActiveIndex(-1);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, value]);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleValueChange(nextValue: string) {
    onValueChange(nextValue);
    setSelectedLocation(null);
    setIsOpen(true);
  }

  function handleSelect(location: LocationSuggestion) {
    setSelectedLocation(location);
    onValueChange(location.name);
    onLocationSelect?.(location);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, suggestions.length - 1),
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const hiddenLat = selectedLocation?.lat ?? defaultLocation?.lat ?? '';
  const hiddenLng = selectedLocation?.lng ?? defaultLocation?.lng ?? '';
  const hiddenVoivodeship =
    selectedLocation?.voivodeship ?? defaultLocation?.voivodeship ?? '';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {hiddenFieldPrefix ? (
        <>
          <input
            type="hidden"
            name={`${hiddenFieldPrefix}.lat`}
            value={hiddenLat}
          />
          <input
            type="hidden"
            name={`${hiddenFieldPrefix}.lng`}
            value={hiddenLng}
          />
          <input
            type="hidden"
            name={`${hiddenFieldPrefix}.voivodeship`}
            value={hiddenVoivodeship}
          />
        </>
      ) : null}
      <div className="relative">
        <Input
          name={name}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-invalid={!!error}
          onChange={(event) => handleValueChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn('pr-9', inputClassName)}
        />
        {isLoading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : selectedLocation ? (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
        ) : (
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {isOpen && value.trim().length >= 2 ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.length === 0 && !isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Brak miejscowości w katalogu
            </div>
          ) : (
            <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
              {suggestions.map((location, index) => (
                <li
                  key={location.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(location);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 px-3 py-2 text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-muted text-foreground'
                      : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {location.name}
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                      {[
                        location.kind,
                        location.parentName
                          ? `przy ${location.parentName}`
                          : null,
                        location.county,
                        location.voivodeship,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeQuery(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l');
}
