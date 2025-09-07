import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      external: [
        // Node.js modules that don't exist in browser
        'http-proxy-agent',
        'https-proxy-agent', 
        'socks-proxy-agent',
        'ws',
        'crypto',
        'fs',
        'path',
        'url',
        'zlib',
        'stream',
        'buffer',
        'util',
        'querystring',
        'http',
        'https',
        'net',
        'tls',
        'events',
        'assert',
      ],
    },
  },
  optimizeDeps: {
    // Don't preload CCXT due to complex dependencies
    exclude: ['ccxt'],
    // Include only necessary polyfills
    include: ['buffer', 'process'],
  },
  // Settings for browser compatibility
  esbuild: {
    define: {
      global: 'globalThis',
    },
  },
}));
