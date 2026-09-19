import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', '*.png', '*.svg'],
      manifest: {
        name: 'BarberShop',
        short_name: 'BarberShop',
        description: 'Book your barbershop appointment online',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#e89b00',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache API responses for 1 hour (non-write requests only)
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/settings/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-settings',
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/services/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-services',
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/barbers/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-barbers',
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatars',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
