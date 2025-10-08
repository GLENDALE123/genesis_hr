import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Tauri용 정적 빌드 설정
  output: process.env.TAURI_BUILD === 'true' ? 'export' : undefined,
  distDir: process.env.TAURI_BUILD === 'true' ? 'out' : '.next',
  
  // 이미지 최적화 설정
  images: {
    unoptimized: process.env.TAURI_BUILD === 'true',
  },
  
  // 후행 슬래시 추가 (Tauri 라우팅 호환성)
  trailingSlash: true,
  
  // 워크스페이스 루트 설정 (경고 제거)
  outputFileTracingRoot: path.join(__dirname),
  
  // 개발 서버 설정 - 외부 접속 허용
  experimental: {
    // 외부 접속을 위한 설정
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
  
  // 개발 서버 인디케이터 설정
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
