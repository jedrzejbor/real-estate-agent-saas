'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="rounded-full"
      onClick={toggleTheme}
      aria-label={isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
      title={isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
