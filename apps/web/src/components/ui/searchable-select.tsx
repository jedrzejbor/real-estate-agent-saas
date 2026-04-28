'use client';

import * as React from 'react';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  /** The hidden input name submitted with the form */
  name: string;
  /** Initial selected option (for edit mode) */
  defaultOption?: SelectOption;
  /** Placeholder shown in search box */
  placeholder?: string;
  /** Called on every keystroke; return list of matching options */
  onSearch: (query: string) => Promise<SelectOption[]>;
  /** Debounce delay in ms */
  debounce?: number;
  /** Error message from form validation */
  error?: string | null;
}

/**
 * Async searchable select — request-optimised.
 *
 * Strategy (senior-level):
 *  1. Query-level cache (`Map<string, SelectOption[]>` in a ref) — identical
 *     queries never hit the network twice, even across open/close cycles.
 *  2. Local filter — when the empty-query ("show all") result is already cached,
 *     subsequent keystrokes filter that list in memory; the server is only called
 *     when the user types something that isn't in the cache yet.
 *  3. AbortController — in-flight requests are cancelled as soon as a new query
 *     arrives, preventing stale responses from overwriting fresh ones.
 *  4. Debounce — only the last keystroke within the window fires a request.
 *
 * – Renders a hidden `<input name={name} value={selectedId} />` for form submission.
 * – Keyboard navigable (↑↓ Enter Escape).
 */
export function SearchableSelect({
  name,
  defaultOption,
  placeholder = 'Szukaj...',
  onSearch,
  debounce = 300,
  error,
}: SearchableSelectProps) {
  const [selected, setSelected] = React.useState<SelectOption | null>(
    defaultOption ?? null,
  );
  const [query, setQuery] = React.useState('');
  const [options, setOptions] = React.useState<SelectOption[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache: query string → results. Persists for the lifetime of the component.
  const cache = React.useRef<Map<string, SelectOption[]>>(new Map());
  // Keeps a ref to the latest onSearch so the effect doesn't need it as a dep.
  const onSearchRef = React.useRef(onSearch);
  React.useLayoutEffect(() => { onSearchRef.current = onSearch; }, [onSearch]);

  // ── Async search with cache + AbortController ──
  React.useEffect(() => {
    if (!isOpen) return;

    // 1. Serve from cache immediately — no spinner, no request.
    if (cache.current.has(query)) {
      setOptions(cache.current.get(query)!);
      setActiveIndex(-1);
      return;
    }

    // 2. Local filter: if the full list (empty-query cache) is available and the
    //    user is just typing, filter in memory while the debounce runs.
    const baseList = cache.current.get('');
    if (baseList && query) {
      const q = query.toLowerCase();
      const localHits = baseList.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.sublabel?.toLowerCase().includes(q) ?? false),
      );
      setOptions(localHits);
      setActiveIndex(-1);
      // Still fall through to fetch — the server may have more matches.
    }

    // 3. Debounced network fetch.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await onSearchRef.current(query);
        if (!controller.signal.aborted) {
          cache.current.set(query, results);
          setOptions(results);
          setActiveIndex(-1);
        }
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, debounce);

    return () => {
      clearTimeout(debounceRef.current!);
      controller.abort();
    };
    // onSearch intentionally excluded — we use onSearchRef to keep it stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOpen, debounce]);

  // ── Close on outside click ──
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function open() {
    setIsOpen(true);
    setQuery('');
  }

  function handleSelect(opt: SelectOption) {
    setSelected(opt);
    setIsOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
    setIsOpen(false);
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
          handleSelect(options[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ''} />

      {/* Trigger */}
      {selected && !isOpen ? (
        // ── Selected state ──
        <div
          role="button"
          tabIndex={0}
          onClick={open}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm shadow-sm transition-colors outline-none cursor-pointer',
            error
              ? 'border-destructive focus-within:ring-destructive/50'
              : 'border-border/80 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          )}
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground leading-tight">
              {selected.label}
            </span>
            {selected.sublabel && (
              <span className="truncate text-[11px] text-muted-foreground leading-tight">
                {selected.sublabel}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              aria-label="Usuń wybór"
              className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      ) : (
        // ── Search input ──
        <div
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 shadow-sm transition-colors',
            isOpen
              ? 'border-ring ring-3 ring-ring/50'
              : error
                ? 'border-destructive'
                : 'border-border/80',
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={open}
            onKeyDown={handleKeyDown}
            placeholder={isOpen ? 'Wpisz, aby szukać...' : placeholder}
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {isLoading && options.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Wyszukiwanie...
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {query ? 'Brak wyników' : 'Zacznij wpisywać, aby szukać'}
            </div>
          ) : (
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {options.map((opt, i) => (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex cursor-pointer flex-col px-3 py-2 text-sm transition-colors',
                    i === activeIndex
                      ? 'bg-muted text-foreground'
                      : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="font-medium leading-tight">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {opt.sublabel}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
