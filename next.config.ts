import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Node.js 런타임을 기본으로 설정 (봇 워커는 Edge 런타임 불필요)
  experimental: {
    // server-only 패키지 지원 (Next.js 13+에서 기본 활성화)
  },
};

export default nextConfig;
