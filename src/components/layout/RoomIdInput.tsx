'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoomIdHistory, removeFromRoomIdHistory } from '../../utils/roomIdHistory.ts';
import styles from './SlugInput.module.css';

interface RoomIdInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function RoomIdInput({ value, onChange, onSubmit }: RoomIdInputProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const closeHistory = useCallback(() => {
    setShowHistory(false);
    setHistoryIndex(-1);
  }, []);

  const openHistory = useCallback(() => {
    const items = getRoomIdHistory();
    if (items.length > 0) {
      setHistoryItems(items);
      setHistoryIndex(-1);
      setShowHistory(true);
    }
  }, []);

  const selectHistory = useCallback(
    (item: string) => {
      onChange(item);
      closeHistory();
    },
    [onChange, closeHistory],
  );

  const handleRemove = useCallback(
    (item: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = removeFromRoomIdHistory(item);
      setHistoryItems(updated);
      if (updated.length === 0) closeHistory();
    },
    [closeHistory],
  );

  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeHistory();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHistory, closeHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (showHistory && historyIndex >= 0 && historyIndex < historyItems.length) {
          selectHistory(historyItems[historyIndex]);
        } else {
          onSubmit();
        }
        return;
      }
      if (e.key === 'Escape') {
        closeHistory();
        return;
      }
      if (showHistory && historyItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHistoryIndex((prev) => (prev < historyItems.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHistoryIndex((prev) => (prev > 0 ? prev - 1 : historyItems.length - 1));
          return;
        }
      }
    },
    [onSubmit, showHistory, historyItems, historyIndex, selectHistory, closeHistory],
  );

  return (
    <div ref={wrapperRef} className={styles.slugWrapper}>
      <label className={styles.label} htmlFor="roomid-input">
        Room ID
      </label>
      <div className={styles.inputRow}>
        <input
          id="roomid-input"
          type="text"
          className={styles.input}
          placeholder="Enter Room ID"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            closeHistory();
          }}
          onFocus={openHistory}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      {showHistory && historyItems.length > 0 && (
        <ul className={styles.historyDropdown} role="listbox">
          {historyItems.map((item, idx) => (
            <li
              key={item}
              role="option"
              aria-selected={idx === historyIndex}
              className={`${styles.historyItem} ${idx === historyIndex ? styles.historyItemActive : ''}`}
              onMouseDown={() => selectHistory(item)}
              onMouseEnter={() => setHistoryIndex(idx)}
            >
              <span className={styles.historyText}>{item}</span>
              <button
                className={styles.historyRemove}
                onMouseDown={(e) => handleRemove(item, e)}
                title="Remove from history"
                aria-label={`Remove ${item}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
