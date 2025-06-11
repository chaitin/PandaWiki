import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config' // Changed to vitest/config

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
  server: {
    hmr: true,
    proxy: {
      "/api": {
        // target: "https://10.10.18.71:2443",
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true
      },
      "/share": {
        // target: "https://10.10.18.71:2443",
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true
      },
      "/static-file": "http://localhost:9000",
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
