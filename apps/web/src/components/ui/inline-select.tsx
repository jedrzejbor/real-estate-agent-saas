'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  /** Current selected value */
  value: string;
  /** Called when a new option is selected */
  onChange: (value: string) => void;
  /** Placeholder label shown when no value selected */
  placeholder: string;
  /** List of options */
  options: InlineSelectOption[];
  /** Optional name for hidden input (form submission) */
  name?: string;
  /** Error state */
  error?: boolean;
  /** Additional wrapper class */
  className?: string;
  /** Height variant: 'sm' = h-9 (filter bar), 'md' = h-10 (form). Default 'md'. */
  size?: 'sm' | 'md';
}

/**
 * Fully custom select dropdown — replaces native <select>.
 * - Custom-styled dropdown panel (no OS system UI)
 * - Keyboard navigable: ↑ ↓ Enter Escape, Tab closes
 * - Closes on outside click
 * - Renders a hidden <input> when `name` is provided for native form submission
 */
export function InlineSelect({
  value,
  onChange,
  placeholder,
  options,
  name,
  error,
  className,
  size = 'md',
}: InlineSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? null;

  // ── Close on outside click ──
  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ── Scroll active item into view ──
  React.useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  // ── Reset active index on open ──
  function open() {
    const currentIdx = options.findIndex((o) => o.value === value);
    setActiveIndex(currentIdx >= 0 ? currentIdx : 0);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function select(val: string) {
    onChange(val);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          select(options[activeIndex].value);
        }
        break;
      case 'Escape':
      case 'Tab':
        close();
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Hidden input for native form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm shadow-sm transition-colors outline-none cursor-pointer select-none',
          size === 'sm' ? 'h-9' : 'h-10',
          isOpen
            ? 'border-ring ring-3 ring-ring/50'
            : error
              ? 'border-destructive ring-3 ring-destructive/20'
              : 'border-border/80 hover:border-border',
          !selectedLabel && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-max overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {/* "No value" option — acts like placeholder reset */}
            <li
              role="option"
              aria-selected={value === ''}
              onMouseDown={(e) => {
                e.preventDefault();
                select('');
              }}
              onMouseEnter={() => setActiveIndex(-1)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                value === ''
                  ? 'bg-accent/60 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/40',
              )}
            >
              <span className="flex-1">{placeholder}</span>
              {value === '' && <Check className="h-3.5 w-3.5 shrink-0" />}
            </li>

            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt.value);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-accent/60 font-medium text-foreground'
                      : isActive
                        ? 'bg-accent/40 text-foreground'
                        : 'text-foreground hover:bg-accent/40',
                  )}
                >
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
