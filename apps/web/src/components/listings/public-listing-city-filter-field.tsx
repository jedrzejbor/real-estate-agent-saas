'use client';

import * as React from 'react';
import { CityAutocomplete } from '@/components/locations/city-autocomplete';

interface PublicListingCityFilterFieldProps {
  initialValue?: string;
}

export function PublicListingCityFilterField({
  initialValue = '',
}: PublicListingCityFilterFieldProps) {
  const [city, setCity] = React.useState(initialValue);

  return (
    <CityAutocomplete
      name="city"
      value={city}
      onValueChange={setCity}
      placeholder="Warszawa"
      inputClassName="h-10 rounded-xl border-border px-3 shadow-none focus-visible:border-primary focus-visible:ring-0"
    />
  );
}
