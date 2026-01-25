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
          // Split charting library (222 KB)
          'recharts': ['recharts'],
          // Split Gemini AI SDK
          'gemini-ai': ['@google/generative-ai'],
          // Split Zustand state management
          'zustand': ['zustand'],
          // Split Lucide icons
          'lucide-icons': ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit since PDF.js worker is large
    chunkSizeWarningLimit: 1000,
  },
})
