// Keyboard Shortcuts Hook - Global keyboard navigation
import { useEffect, useCallback } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

const TAB_ORDER = ['income', 'balance', 'cashflow', 'depreciation', 'debt', 'valuation'] as const;

export function useKeyboardShortcuts() {
  const { activeTab, setActiveTab, resetToDefaults } = useFinanceStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const { key, ctrlKey, altKey, shiftKey } = event;

      // Tab navigation with number keys (1-6)
      if (!ctrlKey && !altKey && !shiftKey && key >= '1' && key <= '6') {
        const tabIndex = parseInt(key) - 1;
        if (tabIndex < TAB_ORDER.length) {
          event.preventDefault();
          setActiveTab(TAB_ORDER[tabIndex]);
        }
        return;
      }

      // Tab navigation with arrow keys
      if (!ctrlKey && !altKey) {
        const currentIndex = TAB_ORDER.indexOf(activeTab);

        if (key === 'ArrowLeft' || (shiftKey && key === 'Tab')) {
          event.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : TAB_ORDER.length - 1;
          setActiveTab(TAB_ORDER[prevIndex]);
          return;
        }

        if (key === 'ArrowRight' || (!shiftKey && key === 'Tab' && altKey)) {
          event.preventDefault();
          const nextIndex = currentIndex < TAB_ORDER.length - 1 ? currentIndex + 1 : 0;
          setActiveTab(TAB_ORDER[nextIndex]);
          return;
        }
      }

      // Ctrl+R - Reset to defaults (with confirmation)
      if (ctrlKey && !altKey && !shiftKey && key.toLowerCase() === 'r') {
        // Don't prevent default browser refresh, just add our shortcut
        // Users can use Ctrl+Shift+R for reset
      }

      // Ctrl+Shift+R - Reset to defaults
      if (ctrlKey && shiftKey && key.toLowerCase() === 'r') {
        event.preventDefault();
        if (window.confirm('Reset all assumptions to defaults?')) {
          resetToDefaults();
        }
        return;
      }

      // ? - Show keyboard shortcuts help
      if (!ctrlKey && !altKey && !shiftKey && key === '?') {
        event.preventDefault();
        // Dispatch custom event for shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
        return;
      }

      // Escape - Close modals/dialogs
      if (key === 'Escape') {
        window.dispatchEvent(new CustomEvent('close-modal'));
        return;
      }
    },
    [activeTab, setActiveTab, resetToDefaults]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '1-6', description: 'Switch to tab 1-6' },
  { key: '←/→', description: 'Navigate between tabs' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Escape', description: 'Close dialogs' },
  { key: 'R', ctrl: true, shift: true, description: 'Reset to defaults' },
].map((s) => ({ ...s, action: () => {} }));
