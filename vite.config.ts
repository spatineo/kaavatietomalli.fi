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
    publicDir: process.env.CONTENT_MODE === 'test' ? 'test-public' : 'public',
    optimizeDeps: {
      include: ['mermaid', '@orama/orama'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('prismjs')) {
                return 'vendor-syntax-prism';
              }
              if (id.includes('katex')) {
                return 'vendor-katex';
              }
              if (
                id.includes('/node_modules/react/') || 
                id.includes('/node_modules/react-dom/') || 
                id.includes('/node_modules/motion/') ||
                id.includes('/node_modules/@motionone/')
              ) {
                return 'vendor-core';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('orama')) {
                return 'vendor-search';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      proxy: {
        '/mml-wmts': {
          target: 'https://avoin-karttakuva.maanmittauslaitos.fi',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/mml-wmts/, '/avoin/wmts'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const apiKey = process.env.MML_API_KEY || env.MML_API_KEY || env.VITE_MML_API_KEY;
              if (apiKey) {
                const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
                proxyReq.setHeader('Authorization', authHeader);
              }
              const referer = req.headers['referer'] || req.headers['referrer'];
              if (referer) {
                proxyReq.setHeader('Referer', referer);
              }
            });
          },
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
