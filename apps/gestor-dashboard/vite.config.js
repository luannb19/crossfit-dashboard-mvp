// vite.config.ts ou vite.config.js (ESM)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:4000', changeOrigin: true, secure: false },

      // 🔁 mapeamentos legados → novos endpoints
      '/weekday-media': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/heatmap/week-hour',
      },
      '/assiduidade-top': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/assiduidade/ranking',
      },
      '/ocupacao-por-dia': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/frequencia',
      },
      '/heatmap': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: () => '/api/heatmap/week-hour',
      },

      // já roteia qualquer /api direto pro backend
      '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
    },
  },
})

