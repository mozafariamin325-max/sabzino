import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'سبزینو | SABZINO',
        short_name: 'سبزینو',
        description: 'با بازیافت، آینده را سبز کنیم',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#002d1c',
        background_color: '#f9f9ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sabzino-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 8,
            },
          },
          // آیکون‌های Material Symbols Outlined از CDN گوگل — CacheFirst تا
          // بعد از اولین بار، آیکون‌ها آفلاین هم نمایش داده شوند (فایل واقعیِ
          // فونت غیرقابل‌تغییر است، پس کش طولانی‌مدت بی‌خطر است).
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  // Liara's "react" platform (see ../frontend/liara.json) requires Vite's
  // build output to be named "build" instead of Vite's default "dist" —
  // purely a deploy-time convention, doesn't affect local dev.
  build: {
    outDir: 'build',
  },
})
