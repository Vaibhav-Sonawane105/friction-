import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: mode === 'test' ? {} : { __PF_CHALLENGE_DEV__: mode === 'challenge-dev' },
  resolve: {
    alias: {
      '#challenge-runtime': resolve(import.meta.dirname, mode === 'challenge-dev' || mode === 'test'
        ? 'src/services/challengeWorker.js' : 'src/services/challengeWorker.disabled.js'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    outDir: mode === 'challenge-dev' ? 'dist-dev' : 'dist',
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'index.html'),
        blocked: resolve(import.meta.dirname, 'blocked.html'),
        background: resolve(import.meta.dirname, 'src/background.js'),
        content: resolve(import.meta.dirname, 'src/content.jsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content-main.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));
