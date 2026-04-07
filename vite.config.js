import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      // To add only specific polyfills, add them here.
      // If empty, it polyfills everything (Buffer, process, events, out, etc).
      include: ['buffer', 'process', 'events', 'stream', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 5173,
    open: false,
  },
  // Ensure we can build despite heavy Web3 dependencies
  build: {
    target: 'esnext'
  }
});
