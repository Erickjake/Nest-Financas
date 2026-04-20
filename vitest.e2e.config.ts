import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
