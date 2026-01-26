// Theme Toggle Component - Dark/Light mode switch
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg transition-colors',
        'hover:bg-zinc-800 dark:hover:bg-zinc-200/10',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={cn(
            'absolute inset-0 w-5 h-5 transition-all duration-300',
            isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100 text-amber-500'
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 w-5 h-5 transition-all duration-300',
            isDark ? 'opacity-100 rotate-0 scale-100 text-blue-400' : 'opacity-0 -rotate-90 scale-0'
          )}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-zinc-400">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

// Compact toggle for tight spaces
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors',
        isDark ? 'bg-zinc-700' : 'bg-zinc-300',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full transition-all duration-300',
          isDark ? 'left-7 bg-blue-400' : 'left-1 bg-amber-500'
        )}
      />
    </button>
  );
}
