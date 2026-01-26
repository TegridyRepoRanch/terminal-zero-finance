// Keyboard Shortcuts Help Modal
import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { cn } from '../../lib/utils';

interface KeyboardShortcutsHelpProps {
  className?: string;
}

export function KeyboardShortcutsHelp({ className }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('show-shortcuts-help', handleOpen);
    window.addEventListener('close-modal', handleClose);

    return () => {
      window.removeEventListener('show-shortcuts-help', handleOpen);
      window.removeEventListener('close-modal', handleClose);
    };
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl',
          'w-full max-w-md mx-4',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h2 id="shortcuts-title" className="text-lg font-semibold text-zinc-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
            >
              <span className="text-sm text-zinc-400">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                {shortcut.ctrl && 'Ctrl + '}
                {shortcut.alt && 'Alt + '}
                {shortcut.shift && 'Shift + '}
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

// Trigger button for keyboard shortcuts
export function KeyboardShortcutsButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('show-shortcuts-help'))}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500',
        className
      )}
      aria-label="Show keyboard shortcuts"
      title="Keyboard shortcuts (?)"
    >
      <Keyboard className="w-5 h-5" />
    </button>
  );
}
