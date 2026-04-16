import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

type SpotRow = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  minihome_public_slug: string | null;
  minihome_intro: string | null;
  minihome_menu: unknown;
  photo_urls: unknown;
};

function hasStringList(raw: unknown): boolean {
  return Array.isArray(raw) && raw.some((x) => String(x).trim().length > 0);
}

function checkRow(s: SpotRow) {
  const hasPublicSlug = Boolean(s.minihome_public_slug?.trim());
  const hasIntro = Boolean(s.minihome_intro?.trim());
  const hasMenu = Array.isArray(s.minihome_menu) && s.minihome_menu.length > 0;
  const hasPhotos = hasStringList(s.photo_urls);
  const missing: string[] = [];
  if (!hasPublicSlug) missing.push('slug');
  if (!hasIntro) missing.push('intro');
  if (!hasMenu) missing.push('menu');
  if (!hasPhotos) missing.push('photos');
  return { hasPublicSlug, hasIntro, hasMenu, hasPhotos, missing, ready: missing.length === 0 };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is missing');
  }
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from('local_spots')
    .select('id,name,slug,is_published,minihome_public_slug,minihome_intro,minihome_menu,photo_urls')
    .order('updated_at', { ascending: false })
    .limit(300);

  if (error) {
    console.error('[ops:check-local-minihome] query failed:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as SpotRow[];
  const published = rows.filter((r) => r.is_published);
  const report = published.map((r) => ({ row: r, check: checkRow(r) }));
  const ready = report.filter((x) => x.check.ready).length;
  const notReady = report.length - ready;

  console.log('[ops:check-local-minihome] published:', report.length, 'ready:', ready, 'not_ready:', notReady);
  if (notReady > 0) {
    for (const item of report.filter((x) => !x.check.ready)) {
      const slug = item.row.minihome_public_slug?.trim() || item.row.slug;
      console.log(
        `- ${item.row.name} (${slug}) missing: ${item.check.missing.join(', ')}`,
      );
    }
  }
}

main().catch((e) => {
  console.error('[ops:check-local-minihome] unexpected error:', e);
  process.exit(1);
});
