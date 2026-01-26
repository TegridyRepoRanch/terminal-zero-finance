import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React together to avoid circular dependencies
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime', 'scheduler'],
          // Chart library
          'recharts': ['recharts'],
          // State management
          'zustand': ['zustand'],
          // UI libraries
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Minify with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
})
