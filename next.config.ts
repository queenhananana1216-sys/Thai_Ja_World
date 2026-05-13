import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

/** 로컬·Docker 빌드에서 마스터 키 파일을 우선 로드(Vercel 등에는 파일이 없으면 무시) */
const masterEnvCandidates = [
  process.env.SUPABASE_MASTER_ENV_PATH,
  'F:/02_Master_Keys/API_JSON/.env.docker',
  process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, 'Desktop', '02_Master_Keys', 'API_JSON', '.env.docker')
    : undefined,
].filter((p): p is string => Boolean(p));

for (const envPath of masterEnvCandidates) {
  try {
    if (fs.existsSync(envPath)) {
      loadEnv({ path: path.resolve(envPath), override: true });
      break;
    }
  } catch {
    /* ignore */
  }
}

// CACHE_BUSTER: 2026-05-01-FORCE-DEPLOY — Vercel 이전 빌드 산출물 재사용 회피(설정 해시 변경)

const nextConfig: NextConfig = {
  /** Docker / self-hosted: minimal Node bundle via `.next/standalone` */
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    /** 엣지·브라우저 캐시 활용 — 동일 src 반복 요청 감소 */
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  /** 상위 폴더에 다른 package-lock 이 있을 때 추적 루트를 이 앱으로 고정 (Vercel/빌드 경고 제거) */
  outputFileTracingRoot: path.resolve(process.cwd()),
  /**
   * 로컬 전용 심링크·다른 앱 폴더는 NFT 추적에서 제외 (Windows EACCES, 불필요한 경로 stat 방지)
   * Vercel 클론에 없는 경로도 패턴으로 무해함
   */
  outputFileTracingExcludes: {
    '*': [
      'Thai_Ja_World/**/*',
      'llangkka/**/*',
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
