import { useEffect, useCallback, useState } from 'react';

const useKeyboardShortcuts = ({
  items,
  currentIndex,
  currentField,
  onNext,
  onPrev,
  onStartEdit,
  onSave,
  onCancel,
  onNewItem,
  isEditing
}) => {
  const [isMac, setIsMac] = useState(false);

  // Mac tespiti
  useEffect(() => {
    const detectMac = () => {
      return (
        navigator.userAgentData?.platform?.toLowerCase().includes('mac') ||
        navigator.platform.toLowerCase().includes('mac') ||
        navigator.userAgent.toLowerCase().includes('mac')
      );
    };
    setIsMac(detectMac());
  }, []);
  const handleKeyDown = useCallback((e) => {
    // Mac için metaKey (Command) VEYA altKey (Option) kontrolü
    const isModifierKey = isMac ? (e.metaKey || e.altKey) : e.altKey;
    const fields = ['category', 'product', 'price'];
    let fieldIndex;
  
    if (isModifierKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewItem();
          break;
        case 'arrowup':
          e.preventDefault();
          onPrev();
          break;
        case 'arrowdown':
          e.preventDefault();
          onNext();
          break;
        case '1':
        case '2':
        case '3':
          e.preventDefault();
          fieldIndex = parseInt(e.key) - 1;
          if (fields[fieldIndex] && items[currentIndex]) {
            onStartEdit(currentIndex, fields[fieldIndex], items[currentIndex]);
          }
          break;
      }
    }
  
    // Enter ve Escape tuşları için modifier key kontrolünü kaldıralım
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave(currentIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
  }, [currentIndex, isEditing, items, onNext, onPrev, onStartEdit, onSave, onCancel, onNewItem, isMac]);
  // Event listener'ı ekle
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isMac };
};

export default useKeyboardShortcuts;