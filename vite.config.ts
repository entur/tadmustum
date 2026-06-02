import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// In Vitest runs, swap CSS imports for an empty module. Vitest's Node-based
// loader chokes on raw .css, and transforming real CSS through Vite for tests
// adds tens of seconds of import time per file for no test value.
const stubCssInVitest = {
  name: 'stub-css-in-vitest',
  enforce: 'pre' as const,
  apply: () => process.env.VITEST === 'true',
  resolveId(source: string) {
    if (source.endsWith('.css')) return '\0empty-css';
    return null;
  },
  load(id: string) {
    if (id === '\0empty-css') return '';
    return null;
  },
};

export default defineConfig({
  plugins: [react(), stubCssInVitest],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Pin the timezone so tests that assert locally-formatted dates/times (e.g.
    // the planned-trips grid) are deterministic regardless of the machine's zone.
    // Without this, a fixture of `08:00Z` renders as `10:00` on a UTC+2 machine
    // and string assertions break only on developers' local runs, not in CI.
    env: {
      TZ: 'UTC',
    },
    server: {
      // Only @mui/x-data-grid imports CSS that the Node loader can't handle
      // directly; the rest of @mui loads fine as native ESM, so we keep this
      // list narrow to avoid transforming the world.
      deps: {
        inline: ['@mui/x-data-grid'],
      },
    },
  },
});
