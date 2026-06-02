import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Components persist filter preferences to localStorage; clear it between tests
// so a toggle in one test never leaks into another's default state. Guarded:
// this jsdom/Node env exposes a `localStorage` object whose methods are absent,
// so calling clear() directly would throw.
afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // Storage methods unavailable in this environment — nothing to clear.
  }
});

// Node 22+ ships an experimental native Web Storage (enabled by default from
// Node 25). Under jsdom, @mui/x-data-grid's localStorage feature-check reaches
// Node's `localStorage` getter at import time, which emits a one-time
// `--localstorage-file was provided without a valid path` warning. jsdom already
// provides a working window.localStorage, so the native one is just noise in
// tests. Swallow only that specific warning and pass everything else through.
// (No-op on Node versions without native Web Storage, e.g. the CI Node 20/22.)
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const text = typeof warning === 'string' ? warning : (warning?.message ?? '');
  if (text.includes('--localstorage-file')) return;
  // @ts-expect-error forward the original (overloaded) arguments unchanged
  return originalEmitWarning(warning, ...args);
}) as typeof process.emitWarning;
