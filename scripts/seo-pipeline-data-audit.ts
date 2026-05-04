/**
 * SEO 파이프라인 데이터 감사 — 민감 값 출력 없음.
 * 프로젝트 루트에서: npx tsx scripts/seo-pipeline-data-audit.ts
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

function envSet(name: string): { ok: boolean; len: number } {
  const v = process.env[name]?.trim();
  return { ok: Boolean(v), len: v?.length ?? 0 };
}

function auditServiceAccountJson(raw: string | undefined): {
  ok: boolean;
  structure: string;
  clientEmailDomain?: string;
} {
  if (!raw?.trim()) return { ok: false, structure: '(empty)' };
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, structure: 'invalid JSON' };
  }
  const type = obj.type;
  const email = obj.client_email;
  const pk = obj.private_key;
  const pid = obj.project_id;
  const parts: string[] = [];
  parts.push(`type=${typeof type === 'string' ? type : '?'}`);
  parts.push(`client_email=${typeof email === 'string' && email.includes('@') ? 'string(…@…)' : 'missing'}`);
  parts.push(`private_key=${typeof pk === 'string' && pk.includes('BEGIN') ? 'PEM_block' : 'missing_or_short'}`);
  parts.push(`project_id=${typeof pid === 'string' ? 'set' : 'optional'}`);
  const ok =
    typeof email === 'string' &&
    email.includes('@') &&
    typeof pk === 'string' &&
    pk.length > 80;
  let clientEmailDomain: string | undefined;
  if (typeof email === 'string' && email.includes('@')) {
    clientEmailDomain = email.split('@')[1]?.slice(0, 40);
  }
  return { ok: Boolean(ok), structure: parts.join(', '), clientEmailDomain };
}

async function main(): Promise<void> {
  const lines: string[] = [];
  lines.push('=== 1) 환경 변수 (값 미출력, 길이만) ===');

  const keys = [
    'GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON',
    'GOOGLE_INDEXING_API_KEY',
    'CRON_SECRET',
    'BOT_CRON_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ] as const;

  const missing: string[] = [];
  for (const k of keys) {
    const { ok, len } = envSet(k);
    lines.push(`  ${k}: ${ok ? `SET (len=${len})` : 'MISSING'}`);
    if (!ok && (k === 'GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON' || k === 'CRON_SECRET')) {
      missing.push(k);
    }
  }

  const rawSa =
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_INDEXING_API_KEY?.trim() ||
    '';
  lines.push('');
  lines.push('=== 서비스 계정 JSON 구조 (내용 비공개) ===');
  const sa = auditServiceAccountJson(rawSa);
  lines.push(`  parse_ok: ${sa.ok}`);
  lines.push(`  structure: ${sa.structure}`);
  if (sa.clientEmailDomain) lines.push(`  email_domain_suffix: ${sa.clientEmailDomain}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  lines.push('');
  lines.push('=== 2) pipeline_error_events (scope=seo.google_indexing, 최근 15건) ===');
  if (!url || !serviceKey) {
    lines.push('  SKIP: SUPABASE_SERVICE_ROLE_KEY 또는 URL 없음 (서버 전용 테이블 조회 불가)');
  } else {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: errs, error: e1 } = await admin
      .from('pipeline_error_events')
      .select('created_at, reason_code, message_excerpt')
      .eq('scope', 'seo.google_indexing')
      .order('created_at', { ascending: false })
      .limit(15);
    if (e1) {
      lines.push(`  QUERY_ERROR: ${e1.message}`);
    } else if (!errs?.length) {
      lines.push('  (최근 기록 없음)');
    } else {
      for (const row of errs) {
        const ex = String(row.message_excerpt ?? '').slice(0, 120);
        lines.push(`  ${row.created_at} | ${row.reason_code} | ${ex}`);
      }
    }
  }

  lines.push('');
  lines.push('=== 3) site_settings seo.indexing_batch_last ===');
  if (!url || !anon) {
    lines.push('  SKIP: Supabase URL/Anon 없음');
  } else {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data: row, error: e2 } = await sb
      .from('site_settings')
      .select('key, value, updated_at')
      .eq('key', 'seo.indexing_batch_last')
      .maybeSingle();
    if (e2) lines.push(`  QUERY_ERROR: ${e2.message}`);
    else if (!row) lines.push('  (행 없음 — 아직 날씨 결속 배치가 기록되지 않았거나 키 미생성)');
    else lines.push(`  updated_at=${row.updated_at} value=${JSON.stringify(row.value)}`);
  }

  lines.push('');
  lines.push('=== 4) DB 건수 vs 사이트맵 상한(참고) ===');
  const caps = { news: 1000, posts: 1200, board_posts: 2000 };
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const [n, p, b] = await Promise.all([
      admin.from('processed_news').select('id', { count: 'exact', head: true }).eq('published', true).in('language', ['ko', 'th']),
      admin.from('posts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'safe'),
      admin.from('board_posts').select('id', { count: 'exact', head: true }),
    ]);
    lines.push(`  processed_news published ko+th: count=${n.count ?? '?'} (sitemap cap ${caps.news})`);
    lines.push(`  posts safe: count=${p.count ?? '?'} (sitemap cap ${caps.posts})`);
    lines.push(`  board_posts: count=${b.count ?? '?'} (sitemap cap ${caps.board_posts})`);
    if ((n.count ?? 0) > caps.news || (p.count ?? 0) > caps.posts) {
      lines.push('  NOTE: 일부 행은 상한 때문에 sitemap에서 잘릴 수 있음(의도된 cap).');
    }
  } else {
    lines.push('  SKIP: service role 없음');
  }

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/u, '') || 'https://www.thaijaworld.com';
  lines.push('');
  lines.push(`=== 5) 라이브 sitemap.xml (${siteBase}/sitemap.xml) ===`);
  try {
    const res = await fetch(`${siteBase}/sitemap.xml`, { redirect: 'follow' });
    lines.push(`  HTTP ${res.status}`);
    const text = await res.text();
    const urlMatches = text.match(/<loc>/g);
    const nLoc = urlMatches?.length ?? 0;
    lines.push(`  <loc> 개수: ${nLoc}`);
    const hasNews = text.includes(`${siteBase}/news/`);
    const hasBoards = text.includes(`${siteBase}/community/boards/`);
    const hasTips = text.includes(`${siteBase}/tips/`);
    lines.push(`  샘플 경로 포함: /news/ ${hasNews}, /community/boards/ ${hasBoards}, /tips/ ${hasTips}`);
  } catch (e) {
    lines.push(`  FETCH_FAIL: ${e instanceof Error ? e.message : String(e)}`);
  }

  lines.push('');
  lines.push('=== 6) 옴니 레이더 HTTP ===');
  try {
    const res = await fetch(`${siteBase}/api/health/omni-radar`, { redirect: 'follow' });
    lines.push(`  HTTP ${res.status}`);
    if (res.ok) {
      const j = (await res.json()) as {
        checks?: {
          seo_indexing?: { ok?: boolean; skipped?: boolean; seo_indexing_ok?: boolean };
          motherbrain?: { seo_indexing_ok?: boolean; seo_indexing_skipped?: boolean; all_green?: boolean };
        };
      };
      const si = j.checks?.seo_indexing;
      const mb = j.checks?.motherbrain;
      lines.push(
        `  checks.seo_indexing: ok=${si?.ok} skipped=${si?.skipped} seo_indexing_ok=${si?.seo_indexing_ok}`,
      );
      lines.push(
        `  checks.motherbrain: all_green=${mb?.all_green} seo_indexing_ok=${mb?.seo_indexing_ok} seo_indexing_skipped=${mb?.seo_indexing_skipped}`,
      );
      lines.push(
        '  NOTE: seo_indexing_skipped=true 이면 서버에서 Indexing API JSON env 미로드(미설정)로 배치 레이더를 생략한 상태일 가능성이 큼.',
      );
    }
  } catch (e) {
    lines.push(`  FETCH_FAIL: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.log(lines.join('\n'));

  if (missing.length) {
    console.log('\n>>> 오너 확인 필요 (비어 있음): ' + missing.join(', '));
    console.log(
      '>>> 프로덕션은 Vercel Environment Variables에 동일 키로 설정해야 크론·Indexing API가 동작합니다.',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
