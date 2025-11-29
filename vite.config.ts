import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.ELECTRON_BUILD === 'true' ? './' : '/', // Electron은 상대 경로, Firebase Hosting은 절대 경로
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // googleapis 패키지가 Node.js 환경을 전제로 하므로 process 객체 폴리필
    'process.env': '{}',
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true, // 외부 접속 허용
  },
});

