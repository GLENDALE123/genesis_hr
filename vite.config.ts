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
    target: 'es2015', // ES6 타겟
    minify: 'esbuild', // 빠른 빌드를 위한 esbuild 사용
    sourcemap: false, // 프로덕션에서는 소스맵 비활성화
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // 코드 스플리팅 최적화
        manualChunks: (id) => {
          // node_modules를 별도 청크로 분리
          if (id.includes('node_modules')) {
            // Firebase는 별도 청크로 분리 (자주 변경되지 않음)
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // React 관련은 별도 청크
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // 나머지 vendor
            return 'vendor';
          }
          // 큰 라이브러리들도 별도 청크로 분리
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        },
        // 청크 파일명 최적화
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 청크 크기 경고 임계값 증가 (큰 라이브러리 대응)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: true, // 외부 접속 허용
  },
});

