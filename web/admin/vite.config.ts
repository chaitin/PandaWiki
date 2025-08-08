import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // 加载环境变量 - 第二个参数是目录路径，不是文件名
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      hmr: true,
      proxy: {
        '/api': {
          target: env.TARGET,
          secure: false,
          changeOrigin: true,
        },
        '/static-file': {
          target: env.STATIC_FILE_TARGET,
          secure: false,
          changeOrigin: true,
        },
        '/share': {
          target: env.SHARE_TARGET,
          secure: false,
          changeOrigin: true,
        },
      },
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
