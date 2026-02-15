import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Load env variables for test environment
const loadTestEnv = () => {
  const env = loadEnv('test', process.cwd(), '');
  return env;
};

/**
 * Custom Vite plugin to block large commentary JSON files from client bundle.
 * These files should only be used server-side.
 */
function blockLargeJsonImports() {
  const blockedPatterns = [
    /commentIndex_(analog|bema|goz|goz_v2)\.json$/,
    /commentIndex\.json$/,  // BEL index
  ];

  return {
    name: 'block-large-json',
    resolveId(source, importer) {
      // Only check during build (not in SSR/test context)
      if (!importer || importer.includes('node_modules')) {
        return null;
      }

      for (const pattern of blockedPatterns) {
        if (pattern.test(source)) {
          this.error(
            `Cannot import large commentary JSON file in client code: ${source}\n` +
            `Use thin index or server-side only. See: scripts/build_analog_thin_index.ts`
          );
        }
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    blockLargeJsonImports(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__legacy_archive__/**',
      '**/__known_flaky__/**',
      '**/__legacy_v6_quarantine__/**',  // G61: V6-dependent tests that need migration
      '**/coverage/**',
      '**/.next/**',
      '**/e2e/**',
      '**/_legacy/**',
      '**/src/docudent/v5/**',
      '**/src/docudent/v7/**',
      '**/*.e2e.spec.ts',  // G68: E2E tests run via Playwright, not Vitest
      '**/*.e2e.test.ts',  // G68: E2E tests run via Playwright, not Vitest
      '**/*.e2e.test.tsx', // G68: E2E tests run via Playwright, not Vitest
      '**/tests/firebase/**', // G69: Needs Firebase emulator running
    ],
    globals: true,
    // Load .env variables for tests (WS1: LLM env loading fix)
    env: loadEnv('test', process.cwd(), ''),
    // Mock framer-motion for JSDOM tests
    alias: {
      'framer-motion': path.resolve(__dirname, './src/docudent/v7/__tests__/helpers/__mocks__/framer-motion.tsx'),
    },
  },
})