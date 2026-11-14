import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Test configuration.
 *
 * Component tests (Stage 9, decision D-15) use Testing Library with jsdom;
 * the existing pure-logic suites run unchanged in the same environment.
 * CSS files are not processed in tests.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
