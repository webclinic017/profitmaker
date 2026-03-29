import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  ],
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
    exclude: ['ccxt'],
    include: ['buffer', 'process'],
  },
  esbuild: {
    define: {
      global: 'globalThis',
    },
  },
}));
