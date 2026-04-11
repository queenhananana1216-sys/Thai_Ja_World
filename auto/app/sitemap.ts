import type { MetadataRoute } from 'next';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';
import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 3600; // 1시간마다 갱신

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAutoSiteBaseUrl();
  const now = new Date();
  
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/minihome`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  ];

  const minihomeEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('user_minihomes')
      .select('public_slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(500);

    for (const row of data ?? []) {
      const slug = row.public_slug as string;
      if (!slug) continue;
      const ts = row.updated_at ? new Date(row.updated_at as string) : now;
      minihomeEntries.push({
        url: `${base}/minihome/${encodeURIComponent(slug)}`,
        lastModified: ts,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Supabase 연결 실패 시 정적 페이지만 반환
  }

  return [...staticEntries, ...minihomeEntries];
}
