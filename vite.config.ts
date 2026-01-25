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
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem - put first to avoid circular deps
            if (id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react') && !id.includes('react-hot-toast')) {
              return 'react-vendor';
            }

            // Chart library - lazy loaded
            if (id.includes('recharts')) {
              return 'recharts';
            }

            // PDF.js - lazy loaded (skip empty chunk warning)
            if (id.includes('pdfjs-dist/build/pdf')) {
              return 'pdfjs';
            }

            // AI SDKs - backend mode only
            if (id.includes('@google/generative-ai')) {
              return 'gemini-ai';
            }
            if (id.includes('@anthropic-ai/sdk')) {
              return 'anthropic-ai';
            }

            // State management
            if (id.includes('zustand')) {
              return 'zustand';
            }

            // UI libraries
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            if (id.includes('react-hot-toast')) {
              return 'toast';
            }
            if (id.includes('@dnd-kit')) {
              return 'dnd-kit';
            }

            // All other vendor code
            return 'vendor';
          }

          // Component-based chunks
          if (id.includes('/src/components/upload/')) {
            return 'upload-flow';
          }
          if (id.includes('/src/components/ValuationEngine')) {
            return 'valuation';
          }
          if (id.includes('/src/lib/financial-logic')) {
            return 'financial-logic';
          }
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
