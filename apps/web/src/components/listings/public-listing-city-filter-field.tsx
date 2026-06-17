'use client';

import * as React from 'react';
import { CityAutocomplete } from '@/components/locations/city-autocomplete';

interface PublicListingCityFilterFieldProps {
  initialValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function PublicListingCityFilterField({
  initialValue = '',
  value,
  onValueChange,
}: PublicListingCityFilterFieldProps) {
  const [internalCity, setInternalCity] = React.useState(initialValue);
  const city = value ?? internalCity;

  function handleValueChange(nextValue: string) {
    onValueChange?.(nextValue);

    if (value === undefined) {
      setInternalCity(nextValue);
    }
  }

  return (
    <CityAutocomplete
      name="city"
      value={city}
      onValueChange={handleValueChange}
      placeholder="Warszawa"
      inputClassName="h-10 rounded-xl border-border px-3 shadow-none focus-visible:border-primary focus-visible:ring-0"
    />
  );
}
