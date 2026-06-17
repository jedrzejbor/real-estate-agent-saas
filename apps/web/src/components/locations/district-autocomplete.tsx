'use client';

import * as React from 'react';
import { Check, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  getCanonicalPublicDistrictName,
  getPublicDistrictSuggestions,
  hasPublicDistrictSuggestions,
  isKnownPublicDistrict,
  normalizeDistrictSearch,
  type PublicDistrictSuggestion,
} from '@/lib/public-districts';
import { searchDistricts, type LocationSuggestion } from '@/lib/locations';
import { cn } from '@/lib/utils';

interface DistrictAutocompleteProps {
  city: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  name?: string;
}

export function DistrictAutocomplete({
  city,
  value,
  onValueChange,
  error,
  placeholder = 'np. Śródmieście',
  className,
  inputClassName,
  name,
}: DistrictAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [suggestions, setSuggestions] = React.useState<
    PublicDistrictSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isValidatingSelectedDistrict, setIsValidatingSelectedDistrict] =
    React.useState(false);
  const [confirmedDistrictKey, setConfirmedDistrictKey] = React.useState<
    string | null
  >(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cacheRef = React.useRef<Map<string, PublicDistrictSuggestion[]>>(
    new Map(),
  );
  const validationCacheRef = React.useRef<Map<string, boolean>>(new Map());
  const hasKnownDistricts = hasPublicDistrictSuggestions(city);
  const currentDistrictKey = buildDistrictSelectionKey(city, value);
  const hasSelectedSuggestedDistrict = hasMatchingDistrictSuggestion(
    city,
    value,
    suggestions,
  );
  const hasSelectedKnownDistrict =
    isKnownPublicDistrict(city, value) ||
    hasSelectedSuggestedDistrict ||
    (Boolean(currentDistrictKey) && currentDistrictKey === confirmedDistrictKey);
  const showSoftHint =
    hasKnownDistricts &&
    value.trim().length > 0 &&
    !isLoading &&
    !isValidatingSelectedDistrict &&
    !hasSelectedKnownDistrict;

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [city, value]);

  React.useEffect(() => {
    if (!currentDistrictKey || isKnownPublicDistrict(city, value)) {
      setConfirmedDistrictKey(null);
      return;
    }

    if (hasMatchingDistrictSuggestion(city, value, suggestions)) {
      setConfirmedDistrictKey(currentDistrictKey);
    }
  }, [city, currentDistrictKey, suggestions, value]);

  React.useEffect(() => {
    if (
      !currentDistrictKey ||
      isKnownPublicDistrict(city, value) ||
      confirmedDistrictKey === currentDistrictKey
    ) {
      setIsValidatingSelectedDistrict(false);
      return;
    }

    const cachedValidation = validationCacheRef.current.get(currentDistrictKey);

    if (cachedValidation !== undefined) {
      if (cachedValidation) {
        setConfirmedDistrictKey(currentDistrictKey);
      }
      setIsValidatingSelectedDistrict(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsValidatingSelectedDistrict(true);

      try {
        const results = await searchDistricts(city, value, 8);
        const hasMatch = hasMatchingDistrictSuggestion(
          city,
          value,
          results.map(toPublicDistrictSuggestion),
        );

        if (!controller.signal.aborted) {
          validationCacheRef.current.set(currentDistrictKey, hasMatch);
          setConfirmedDistrictKey(hasMatch ? currentDistrictKey : null);
          setIsValidatingSelectedDistrict(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          validationCacheRef.current.set(currentDistrictKey, false);
          setConfirmedDistrictKey(null);
          setIsValidatingSelectedDistrict(false);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      setIsValidatingSelectedDistrict(false);
    };
  }, [city, confirmedDistrictKey, currentDistrictKey, value]);

  React.useEffect(() => {
    if (!isOpen || !city.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${city.trim().toLowerCase()}|${value.trim().toLowerCase()}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setSuggestions(cached);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await searchDistricts(city, value, 8);
        const mappedResults = results.map(toPublicDistrictSuggestion);

        if (!controller.signal.aborted) {
          cacheRef.current.set(cacheKey, mappedResults);
          setSuggestions(mappedResults);
        }
      } catch {
        const fallback = getPublicDistrictSuggestions(city, value);

        if (!controller.signal.aborted) {
          cacheRef.current.set(cacheKey, fallback);
          setSuggestions(fallback);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [city, isOpen, value]);

  function handleValueChange(nextValue: string) {
    const nextDistrictKey = buildDistrictSelectionKey(city, nextValue);

    if (nextDistrictKey !== confirmedDistrictKey) {
      setConfirmedDistrictKey(null);
    }

    onValueChange(nextValue);
    setIsOpen(true);
  }

  function handleSelect(district: PublicDistrictSuggestion) {
    setConfirmedDistrictKey(
      buildDistrictSelectionKey(district.city, district.name),
    );
    onValueChange(district.name);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleBlur() {
    const canonicalName = getCanonicalPublicDistrictName(city, value);

    if (canonicalName && canonicalName !== value.trim()) {
      onValueChange(canonicalName);
    }
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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn('pr-9', inputClassName)}
        />
        {hasSelectedKnownDistrict ? (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
        ) : (
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {isOpen && (hasKnownDistricts || suggestions.length > 0 || isLoading) ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {isLoading
                ? 'Szukamy dzielnic...'
                : 'Brak pasującej dzielnicy w katalogu'}
            </div>
          ) : (
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {suggestions.map((district, index) => (
                <li
                  key={`${district.normalizedCity}-${district.normalizedName}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(district);
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
                      {district.name}
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                      {district.city}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {showSoftHint ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Ta dzielnica nie jest jeszcze w katalogu. Możesz zapisać ją ręcznie.
        </p>
      ) : null}
    </div>
  );
}

function toPublicDistrictSuggestion(
  location: LocationSuggestion,
): PublicDistrictSuggestion {
  return {
    city: location.parentName ?? location.municipality ?? location.county,
    name: location.name,
    normalizedCity: normalizeAutocompleteValue(
      location.parentName ?? location.municipality ?? location.county,
    ),
    normalizedName: normalizeAutocompleteValue(location.name),
    aliases: [],
  };
}

function normalizeAutocompleteValue(value: string): string {
  return normalizeDistrictSearch(value);
}

function buildDistrictSelectionKey(
  city: string,
  district: string,
): string | null {
  const cityKey = normalizeDistrictSearch(city);
  const districtKey = normalizeDistrictSearch(district);

  return cityKey && districtKey ? `${cityKey}|${districtKey}` : null;
}

function hasMatchingDistrictSuggestion(
  city: string,
  value: string,
  suggestions: PublicDistrictSuggestion[],
): boolean {
  const cityKey = normalizeDistrictSearch(city);
  const valueKey = normalizeDistrictSearch(value);

  if (!cityKey || !valueKey) {
    return false;
  }

  return suggestions.some((suggestion) => {
    if (suggestion.normalizedCity !== cityKey) {
      return false;
    }

    const searchKeys = [
      suggestion.normalizedName,
      normalizeDistrictSearch(suggestion.name),
      ...suggestion.aliases.map(normalizeDistrictSearch),
    ].filter(Boolean);

    return searchKeys.includes(valueKey);
  });
}
