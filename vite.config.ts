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
        manualChunks: (id) => {
          // Important: Order matters! Check most specific first

          // Split PDF.js into its own chunk (large library - 446 KB)
          if (id.includes('pdfjs-dist')) {
            return 'pdfjs';
          }

          // Split charting library (222 KB)
          if (id.includes('recharts')) {
            return 'recharts';
          }

          // Split React core, DOM, and scheduler together (avoids circular dependency)
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }

          // Split Gemini AI SDK
          if (id.includes('@google/generative-ai')) {
            return 'gemini-ai';
          }

          // Split Zustand state management
          if (id.includes('zustand')) {
            return 'zustand';
          }

          // Split Lucide icons
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }

          // All other node_modules (Tailwind, clsx, etc.)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit since PDF.js worker is large
    chunkSizeWarningLimit: 1000,
  },
})
