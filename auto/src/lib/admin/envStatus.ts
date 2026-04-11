import 'server-only';

/** 관리자 대시보드용 — 값은 노출하지 않고 설정 여부만 */
export type EnvCheckRow = {
  key: string;
  label: string;
  ok: boolean;
  role: 'seo' | 'security' | 'ops';
  hint: string;
};

function has(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

/**
 * SEO·안전·운영에 쓰는 주요 키 — 미설정이면 빨간 표시만 (시크릿 값은 절대 출력 안 함)
 */
export function getAdminEnvChecks(): EnvCheckRow[] {
  const publicUrl = has('NEXT_PUBLIC_AUTO_SITE_URL') || has('VERCEL_URL');

  return [
    {
      key: 'NEXT_PUBLIC_AUTO_SITE_URL',
      label: '공개 베이스 URL',
      ok: publicUrl,
      role: 'seo',
      hint: 'canonical·OG·사이트맵. Vercel은 VERCEL_URL로 대체 가능.',
    },
    {
      key: 'AUTO_ADMIN_SECRET',
      label: '관리자 로그인',
      ok: has('AUTO_ADMIN_SECRET'),
      role: 'security',
      hint: '이 콘솔·민감 작업 보호.',
    },
    {
      key: 'CRON_SECRET',
      label: '크론 Bearer',
      ok: has('CRON_SECRET'),
      role: 'security',
      hint: '/api/cron/* 호출 시 Authorization 검증.',
    },
    {
      key: 'INGEST_BOT_SECRET',
      label: '봇 업로드 시크릿',
      ok: has('INGEST_BOT_SECRET'),
      role: 'security',
      hint: 'POST /api/bot/ingest — IP 화이트리스트와 병행.',
    },
    {
      key: 'DATABASE_URL',
      label: 'Postgres',
      ok: has('DATABASE_URL'),
      role: 'ops',
      hint: '없으면 인메모리(개발용). 프로덕션은 필수 권장.',
    },
    {
      key: 'TAEJA_PUBLIC_URL',
      label: '태자 월드 URL',
      ok: has('TAEJA_PUBLIC_URL'),
      role: 'ops',
      hint: '헬스 HEAD·이상 감지 대상.',
    },
    {
      key: 'VERCEL_TOKEN',
      label: 'Vercel API',
      ok: has('VERCEL_TOKEN'),
      role: 'ops',
      hint: '도메인 연결·프로젝트 조작.',
    },
    {
      key: 'EDGE_CONFIG',
      label: 'Edge Config',
      ok: has('EDGE_CONFIG') || has('EDGE_CONFIG_ID'),
      role: 'ops',
      hint: '태자 middleware와 standby 동기화.',
    },
  ];
}
