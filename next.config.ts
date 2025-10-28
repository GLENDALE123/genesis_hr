import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Electron용 정적 빌드 설정
  output: process.env.ELECTRON_BUILD === 'true' ? 'export' : undefined,
  distDir: 'out',
  // 파일 프로토콜에서 정적 자산 상대 경로 사용
  assetPrefix: process.env.ELECTRON_BUILD === 'true' ? './' : undefined,
  
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
  
  // Turbopack 설정 (Next.js 16 기본값, webpack과 충돌 방지)
  turbopack: {},
  
  // 터보백 활성화를 위한 추가 설정
  typescript: {
    // 타입 체크를 비동기로 처리하여 터보백 성능 향상
    ignoreBuildErrors: false,
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
  
  // CORS 헤더 및 정적 캐시 설정
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
      // 정적 자산 캐시 헤더
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 폰트 파일 캐시 헤더
      {
        source: '/_next/static/media/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 이미지 파일 캐시 헤더
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      // 공용 정적 파일 캐시 헤더
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
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
