import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, '/api/v3'),
      },
      '/api/cryptocompare': {
        target: 'https://min-api.cryptocompare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cryptocompare/, ''),
      },
      '/api/coinpaprika': {
        target: 'https://api.coinpaprika.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinpaprika/, '/v1'),
      },
      '/api/arkham': {
        target: 'https://api.arkhamintelligence.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arkham/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('API-Key', 'a2b649b2-4f66-4b1d-811b-a343a6dc7cb6');
          });
        },
      },
      '/gamma-api': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gamma-api/, ''),
        secure: true,
      },
      '/clob-api': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/clob-api/, ''),
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
