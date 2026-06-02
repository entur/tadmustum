import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

// The jsdom/Node test env ships a localStorage object without working methods,
// so swap in a simple Map-backed store to exercise the persistence behaviour.
function installMockStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
}

describe('usePersistentState', () => {
  beforeEach(() => installMockStorage());
  afterEach(() => vi.unstubAllGlobals());

  it('returns the default when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentState('k', false));
    expect(result.current[0]).toBe(false);
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => usePersistentState('k', false));

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('k')).toBe('true');
  });

  it('initialises from a previously stored value (survives a remount)', () => {
    localStorage.setItem('k', JSON.stringify(true));

    const { result } = renderHook(() => usePersistentState('k', false));

    expect(result.current[0]).toBe(true);
  });

  it('falls back to the default when the stored value is corrupt', () => {
    localStorage.setItem('k', '{not json');

    const { result } = renderHook(() => usePersistentState('k', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });
});
