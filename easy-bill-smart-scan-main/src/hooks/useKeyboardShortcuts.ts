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
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      // ✅ Allow Enter in inputs
      if (isInput && e.key === 'Enter' && onAddItem) {
        return;
      }

      // ⚠️ For other shortcuts, only work if NOT in input (unless with Ctrl/Cmd)
      if (isInput && !e.ctrlKey && !e.metaKey) {
        return;
      }

      // ✅ Alt + N - New Bill (instead of Ctrl+N which opens new tab)
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        if (onNewBill) onNewBill();
        return;
      }

      // ✅ Alt + S - Save/Print (instead of Ctrl+S which saves page)
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (onSave) onSave();
        return;
      }

      // ✅ Alt + P - Print (instead of Ctrl+P which opens print dialog)
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        if (onPrint) onPrint();
        return;
      }

      // ✅ Ctrl + F - Focus Code (works in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (onFocusCode) onFocusCode();
        return;
      }

      // ✅ Ctrl + Shift + F - Focus Customer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        e.stopPropagation();
        if (onFocusCustomer) onFocusCustomer();
        return;
      }

      // ✅ Alt + C - Clear Cart
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        if (onClear) onClear();
        return;
      }

      // ✅ Ctrl + Delete - Clear Cart (alternative)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        e.stopPropagation();
        if (onClear) onClear();
        return;
      }

      // ✅ Alt + V - Preview (instead of F1 which conflicts with help)
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        if (onPreview) onPreview();
        return;
      }

      // ✅ Alt + F - Focus Search (instead of F2)
      if (e.altKey && e.key === 'f' && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        if (onSearch) onSearch();
        return;
      }

      // ✅ Escape - Cancel (works anywhere)
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        return;
      }
    },
    [onNewBill, onPrint, onSave, onSearch, onClear, onAddItem, onFocusCode, onFocusCustomer, onCancel, onPreview]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
}