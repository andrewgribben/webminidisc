import { defineConfig, } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import inject from '@rollup/plugin-inject';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

let base = process.env.PUBLIC_URL ?? '/';
if(!base.endsWith("/")) base += '/';

console.log(`Building for base = ${base}`);

// https://vitejs.dev/config/
export default ({ mode }) => {
  return defineConfig({
    base,
    plugins: [
      basicSsl(),
      svgr(),
      react(),
      nodePolyfills({
        globals: {
          Buffer: false,
        },
        exclude: ['buffer'],
      }),
      VitePWA({
        // Wait until this page asks. autoUpdate calls skipWaiting immediately, and a
        // reload during recording closes the WebUSB session.
        registerType: 'prompt',
        injectRegister: null,
        manifestFilename: 'manifest.json',
        manifest: {
          "short_name": "Web MiniDisc",
          "name": "Web MiniDisc",
          "description": "Upload music to NetMD MiniDisc devices",
          "icons": [
            {
              "src": "MiniDisc192.png",
              "type": "image/png",
              "sizes": "192x192"
            },
            {
              "src": "MiniDisc512.png",
              "type": "image/png",
              "sizes": "512x512"
            },
            {
              "src": "favicon.ico",
              "sizes": "64x64 32x32 24x24 16x16",
              "type": "image/x-icon"
            }
          ],
          "start_url": ".",
          "display": "standalone",
          "theme_color": "#000000",
          "orientation": "portrait",
          "background_color": "#ffffff",
          "splash_pages": null
        },
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 1024 * 1024 * 10, // 10 MiB
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      // WebUSB requires a secure context; localhost HTTPS is fine with the basic-ssl cert.
      https: true,
    },
    build: {
      commonjsOptions: { transformMixedEsModules: true },
      rollupOptions: {
        plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
      },
    }
  })
}
