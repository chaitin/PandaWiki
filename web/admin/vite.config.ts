import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    hmr: true,
    proxy: {
      '/api': {
        // target: 'http://10.10.7.43:8000',
        target: 'https://10.10.18.71:2443',
        // target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
      },
      '/share': {
        // target: 'http://10.10.7.43:8000',
        target: 'https://10.10.18.71:2443',
        // target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
      },
      '/static-file': 'https://10.10.7.43:2443',
    },
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
