import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mapboxToken = env.MAPBOX_TOKEN || env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN || '';
  const apiUrl = env.API_URL || env.API_BASE_URL || process.env.API_URL || process.env.API_BASE_URL || '';
  const wsUrl = env.WS_URL || process.env.WS_URL || '';

  return {
    define: {
      __APP_ENV__: JSON.stringify({
        MAPBOX_TOKEN: mapboxToken,
        API_URL: apiUrl,
        WS_URL: wsUrl,
      }),
      'import.meta.env.MAPBOX_TOKEN': JSON.stringify(mapboxToken),
      'import.meta.env.API_URL': JSON.stringify(apiUrl),
      'import.meta.env.WS_URL': JSON.stringify(wsUrl),
    },
    plugins: [
      react(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'assets/*', 'models/*.onnx'],
      manifest: false, // Using public/manifest.json directly
      workbox: {
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024, // 35 MB to accommodate ONNX and WASM binary blobs
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,onnx,wasm}'],
        globIgnores: ['**/*jsep*.wasm'], // Exclude large unused WebGPU JSEP binary
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/, /^\/health/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache Mapbox vector styles, fonts and tiles
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles-cache-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts stylesheets & webfonts
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // NetworkFirst for API GET routes
            urlPattern: /\/api\/v1\/(?!health).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-runtime-cache-v1',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 15, // 15 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
};
});

