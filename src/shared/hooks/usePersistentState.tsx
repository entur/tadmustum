import { useEffect, useState } from 'react';

/**
 * Like useState, but the value is mirrored to localStorage under `key` so it
 * survives navigation away and back, a full page refresh, and reopening the tab.
 * Reads are tolerant: a missing, unparseable, or unavailable store falls back to
 * `defaultValue` rather than throwing.
 */
export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write failures (storage disabled, full, or unavailable).
    }
  }, [key, value]);

  return [value, setValue] as const;
}
