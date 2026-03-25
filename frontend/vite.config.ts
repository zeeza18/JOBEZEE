import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split vendor libs into stable chunks — browsers cache them across deploys
        manualChunks: {
          'vendor-react'  : ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui'     : ['framer-motion', 'lucide-react'],
          'vendor-state'  : ['zustand'],
          'vendor-charts' : ['recharts'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
