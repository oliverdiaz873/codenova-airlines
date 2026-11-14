import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount every rendered tree between tests so queries never see leftovers.
afterEach(() => {
  cleanup();
});
