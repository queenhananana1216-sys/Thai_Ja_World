/**
 * 091_fix_bangkokpost_rss_404.sql 과 동일 — Supabase에 마이그레이션 CLI 없이 적용할 때 사용.
 *   npx tsx scripts/apply-bangkokpost-rss-fix.ts
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('[apply-bp-rss] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const pairs: [string, string][] = [
  ['https://www.bangkokpost.com/rss/data/crime.xml', 'https://www.bangkokpost.com/rss/data/thailand.xml'],
  ['https://www.bangkokpost.com/rss/data/general.xml', 'https://www.bangkokpost.com/rss/data/topstories.xml'],
];

async function main() {
  for (const [oldUrl, newUrl] of pairs) {
    const { data, error } = await sb
      .from('knowledge_sources')
      .update({ rss_url: newUrl })
      .eq('kind', 'rss')
      .eq('rss_url', oldUrl)
      .select('id,name');
    if (error) {
      console.error('[apply-bp-rss] 실패', oldUrl, error.message);
      process.exit(1);
    }
    console.log(`[apply-bp-rss] ${oldUrl.slice(-24)} → 갱신 행 수: ${data?.length ?? 0}`, data?.map((r) => r.name).join(', ') || '(없음)');
  }
}

void main();
