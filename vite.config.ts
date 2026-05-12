import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || '/';
  
  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    publicDir: 'public',
    optimizeDeps: {
      include: ['mermaid'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
                return 'vendor-syntax';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('motion')) {
                return 'vendor-core';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
