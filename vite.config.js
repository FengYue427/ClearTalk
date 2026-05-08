import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          core: ['./core/state.js', './core/storage.js', './core/i18n.js'],
          services: ['./services/ai-service.js', './services/sync-service.js', './services/user-service.js', './services/market-service.js'],
          ui: ['./ui/components/index.js', './ui/pages/index.js'],
          scenes: ['./scenes/index.js']
        }
      }
    }
  },
  server: {
    port: 8080,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  esbuild: {
    drop: ['console', 'debugger']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
