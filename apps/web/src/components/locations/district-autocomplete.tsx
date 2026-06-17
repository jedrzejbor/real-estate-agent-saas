'use client';

import * as React from 'react';
import { Check, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  getCanonicalPublicDistrictName,
  getPublicDistrictSuggestions,
  hasPublicDistrictSuggestions,
  isKnownPublicDistrict,
  type PublicDistrictSuggestion,
} from '@/lib/public-districts';
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const suggestions = React.useMemo(
    () => getPublicDistrictSuggestions(city, value),
    [city, value],
  );
  const hasKnownDistricts = hasPublicDistrictSuggestions(city);
  const hasSelectedKnownDistrict = isKnownPublicDistrict(city, value);
  const showSoftHint =
    hasKnownDistricts && value.trim().length > 0 && !hasSelectedKnownDistrict;

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

  function handleValueChange(nextValue: string) {
    onValueChange(nextValue);
    setIsOpen(true);
  }

  function handleSelect(district: PublicDistrictSuggestion) {
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

      {isOpen && hasKnownDistricts ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Brak pasującej dzielnicy w katalogu
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
