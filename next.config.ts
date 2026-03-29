import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** 상위 폴더에 다른 package-lock 이 있을 때 추적 루트를 이 앱으로 고정 (Vercel/빌드 경고 제거) */
  outputFileTracingRoot: path.resolve(process.cwd()),
  experimental: {
    // server-only 패키지 지원 (Next.js 13+에서 기본 활성화)
  },
  /** 네트워크 드라이브 등에서 파일 감시가 안 되면 dev가 Starting에서 멈춘 것처럼 보일 수 있음 */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
