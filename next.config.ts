import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Electron용 정적 빌드 설정
  output: process.env.ELECTRON_BUILD === 'true' ? 'export' : undefined,
  distDir: 'out',
  
  // 이미지 최적화 설정
  images: {
    unoptimized: process.env.ELECTRON_BUILD === 'true',
  },
  
  // 후행 슬래시 추가 (Electron 라우팅 호환성)
  trailingSlash: process.env.ELECTRON_BUILD === 'true',
  
  // 워크스페이스 루트 설정 (경고 제거)
  outputFileTracingRoot: path.join(__dirname),
  
  // 개발 서버 설정 - 외부 접속 허용
  experimental: {
    // 외부 접속을 위한 설정
    // 개발 모드 최적화
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Turbopack 설정
  turbopack: {
    // 파일 감시 성능 최적화
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    // Path aliases
    resolveAlias: {
      '@': './src',
    },
  },
  
  // 개발 모드 성능 최적화
  reactStrictMode: true,
  
  // webpack 설정 (Turbopack 미사용 시 폴백)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fast Refresh를 위한 설정
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  
  // CORS 헤더 설정 (개발 환경에서만)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // 정적 파일 리라이트 (notification.html을 public에서 제공)
  async rewrites() {
    return [
      {
        source: '/notification.html',
        destination: '/notification.html',
      },
    ];
  },
  
  // 개발 서버 인디케이터 설정
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
