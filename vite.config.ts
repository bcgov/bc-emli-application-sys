import ReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import RubyPlugin from 'vite-plugin-ruby';

export default defineConfig({
  plugins: [RubyPlugin(), ReactPlugin()],
  optimizeDeps: {
    include: [
      '@snowplow/browser-tracker',
      '@snowplow/browser-plugin-link-click-tracking',
      '@snowplow/browser-plugin-form-tracking',
    ],
  },
});
