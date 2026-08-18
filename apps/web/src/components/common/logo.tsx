import Image from 'next/image';
import { APP_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: {
    full: { className: 'h-10 w-[120px]', width: 120, height: 40 },
    mark: { className: 'h-8 w-8', width: 32, height: 32 },
  },
  md: {
    full: { className: 'h-[54px] w-[160px]', width: 160, height: 54 },
    mark: { className: 'h-10 w-10', width: 40, height: 40 },
  },
  lg: {
    full: { className: 'h-[74px] w-[220px]', width: 220, height: 74 },
    mark: { className: 'h-14 w-14', width: 56, height: 56 },
  },
} as const;

/** Product logo reused across navbar, sidebar, footer, etc. */
export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const s = sizes[size];
  const asset = showText ? s.full : s.mark;
  const lightSrc = showText
    ? '/brand/logo-full-light.png'
    : '/brand/logo-mark-light.png';
  const darkSrc = showText
    ? '/brand/logo-full-dark.png'
    : '/brand/logo-mark-dark.png';

  return (
    <div className={cn('relative inline-flex shrink-0 items-center', className)}>
      <Image
        src={lightSrc}
        alt={APP_NAME}
        width={asset.width}
        height={asset.height}
        priority
        className={cn(asset.className, 'object-contain dark:hidden')}
      />
      <Image
        src={darkSrc}
        alt={APP_NAME}
        width={asset.width}
        height={asset.height}
        priority
        className={cn(asset.className, 'hidden object-contain dark:block')}
      />
    </div>
  );
}
