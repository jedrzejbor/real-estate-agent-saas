import { ExternalLink } from 'lucide-react';

import { buildGoogleMapsSearchUrl } from '@/lib/contact-links';
import { cn } from '@/lib/utils';

interface AddressLinkProps {
  address: string;
  className?: string;
}

export function AddressLink({ address, className }: AddressLinkProps) {
  return (
    <a
      href={buildGoogleMapsSearchUrl(address)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-start gap-1 break-words text-sm font-medium text-primary hover:underline',
        className,
      )}
    >
      <span>{address}</span>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
