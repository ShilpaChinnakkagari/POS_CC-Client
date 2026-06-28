// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onNewBill?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
  onClear?: () => void;
  onAddItem?: () => void;
  onFocusCode?: () => void;
  onFocusCustomer?: () => void;
  onCancel?: () => void;
  onPreview?: () => void;
}

export function useKeyboardShortcuts({
  onNewBill,
  onPrint,
  onSave,
  onSearch,
  onClear,
  onAddItem,
  onFocusCode,
  onFocusCustomer,
  onCancel,
  onPreview,
}: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // ✅ Don't trigger shortcuts if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Enter in inputs
        if (e.key === 'Enter' && onAddItem) {
          // Let the input handle Enter
          return;
        }
        // For other shortcuts, check if Ctrl/Cmd is pressed
        if (!e.ctrlKey && !e.metaKey) return;
      }

      // Ctrl+N or Cmd+N - New Bill
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (onNewBill) onNewBill();
        return;
      }

      // Ctrl+P or Cmd+P - Print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (onPrint) onPrint();
        return;
      }

      // Ctrl+S or Cmd+S - Save/Print
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }

      // Ctrl+F or Cmd+F - Focus Search/Code
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (onFocusCode) onFocusCode();
        return;
      }

      // Ctrl+Shift+F - Focus Customer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        if (onFocusCustomer) onFocusCustomer();
        return;
      }

      // Escape - Clear/Cancel
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        return;
      }

      // F1 - Preview
      if (e.key === 'F1') {
        e.preventDefault();
        if (onPreview) onPreview();
        return;
      }

      // Delete/Backspace - Clear cart
      if ((e.key === 'Delete' || e.key === 'Backspace') && e.ctrlKey) {
        e.preventDefault();
        if (onClear) onClear();
        return;
      }

      // F2 - Search/Clear
      if (e.key === 'F2') {
        e.preventDefault();
        if (onSearch) onSearch();
        return;
      }
    },
    [onNewBill, onPrint, onSave, onSearch, onClear, onAddItem, onFocusCode, onFocusCustomer, onCancel, onPreview]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}