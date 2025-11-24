<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const isElectronBuild = process.env.ELECTRON_BUILD === 'true';
  
  // 환경 변수 객체 생성
  const envVars = {
    NODE_ENV: mode,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '',
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || process.env.VITE_FIREBASE_VAPID_KEY || '',
    NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    ELECTRON_BUILD: process.env.ELECTRON_BUILD || '',
  };
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // process.env를 전역으로 정의하여 Next.js 호환성 유지
      // Vite는 기본적으로 process.env를 지원하지 않으므로 define으로 명시적으로 정의
      'process.env': JSON.stringify(envVars),
      // process.platform도 개별적으로 정의 (일부 코드에서 사용)
      'process.platform': JSON.stringify(process.platform || 'browser'),
    },
    server: {
      port: 5173,
      host: true,
      strictPort: false,
    },
    build: {
      target: 'es2015', // ES6 호환성
      outDir: isElectronBuild ? 'electron-out' : 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            // 코드 스플리팅 설정
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          },
        },
      },
      // Electron 빌드 시 상대 경로 사용
      ...(isElectronBuild && {
        base: './',
      }),
    },
  };
});
=======
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Electron 및 상대 경로 배포 지원
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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

>>>>>>> develop
