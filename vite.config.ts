import ReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import RubyPlugin from 'vite-plugin-ruby';

export default defineConfig({
  plugins: [RubyPlugin(), ReactPlugin()],
  resolve: {
    alias: [
      // Custom CHEFS components do `import { Components } from 'formiojs'` to
      // get the base classes they extend. Under @formio/react 6.x the runtime
      // is @formio/js 5.x, which calls APIs (conditionallyHidden, etc.) that
      // only exist on 5.x base classes. This exact-match alias makes the main
      // `formiojs` entry resolve to `@formio/js` so all custom components
      // extend 5.x classes — while leaving `formiojs/components/...` subpath
      // imports (used for editForm configs) pointing at the real 4.x package.
      { find: /^formiojs$/, replacement: '@formio/js' },
    ],
  },
  server: {
    // Allow requests from Rails app container and browser in Docker dev setup.
    // Vite 8 blocks requests from non-matching hosts by default.
    allowedHosts: true,
  },
  css: {
    lightningcss: {
      errorRecovery: true,
    },
  },
  optimizeDeps: {
    // Force esbuild to pre-bundle CJS packages into ESM so rolldown
    // doesn't mangle their default exports (React error #130)
    include: ['formiojs', '@formio/react', '@formio/js'],
  },
});
