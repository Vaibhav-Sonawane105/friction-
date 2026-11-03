import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: mode === 'test' ? {} : {
    __PF_CHALLENGE_DEV__: ['challenge-dev', 'private-preview'].includes(mode),
    __PF_DEV_CONTROLS__: mode === 'challenge-dev',
    __PF_REDESIGN__: ['challenge-dev', 'private-preview'].includes(mode),
    ...(mode === 'private-preview' ? {
      'import.meta.env.VITE_API_URL': JSON.stringify(loadEnv('production', import.meta.dirname, 'VITE_').VITE_API_URL || 'https://progressive-friction-api.onrender.com'),
    } : {}),
  },
  resolve: {
    alias: {
      ...(['challenge-dev', 'private-preview'].includes(mode) ? Object.fromEntries([
        ['../challenges/workerRegistry','redesignWorker'],
        ['../challenges/catalog','redesignCatalog'],
        ['../../challenges/registry','redesignRegistry'],
        ['../challenges/registry','redesignRegistry'],
      ].map(([from,to]) => [from, resolve(import.meta.dirname, 'src/challenges', to+'.js')])) : {}),
      '#challenge-runtime': resolve(import.meta.dirname, mode === 'private-preview'
        ? 'src/services/challengeWorker.preview.js'
        : mode === 'challenge-dev' || mode === 'test' ? 'src/services/challengeWorker.js' : 'src/services/challengeWorker.disabled.js'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    outDir: mode === 'private-preview' ? 'dist-preview' : mode === 'challenge-dev' ? 'dist-dev' : 'dist',
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
