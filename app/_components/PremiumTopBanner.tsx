import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
  badge_text: string | null;
  sort_order: number;
  extra: unknown;
};

/**
 * 네비 아래 상단 프리미엄 배너 슬롯 (RLS: 활성·기간 내만)
 */
export default async function PremiumTopBanner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) return null;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb
      .from('premium_banners')
      .select('id,title,subtitle,image_url,href,badge_text,sort_order,extra')
      .eq('slot', 'top_bar')
      .order('sort_order', { ascending: true });

    if (error || !data?.length) return null;

    const banners = data as BannerRow[];

    return (
      <div className="premium-top-banner" aria-label="프로모션">
        {banners.map((b) => {
          const inner = (
            <div
              className="premium-top-banner__row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 20px',
                background: 'linear-gradient(90deg, #4c1d95 0%, #6d28d9 40%, #5b21b6 100%)',
                color: '#f5f3ff',
                fontSize: 13,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {b.image_url && /^(https?:\/\/|\/\/|\/)/i.test(b.image_url.trim()) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.image_url}
                  alt={b.title ?? ''}
                  width={40}
                  height={40}
                  style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : null}
              <div style={{ textAlign: 'center', flex: '1 1 200px' }}>
                {b.badge_text ? (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: 'rgba(255,255,255,0.2)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      marginBottom: 4,
                    }}
                  >
                    {b.badge_text}
                  </span>
                ) : null}
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                {b.subtitle ? <div style={{ opacity: 0.9, marginTop: 2 }}>{b.subtitle}</div> : null}
              </div>
            </div>
          );

          if (b.href?.trim()) {
            return (
              <Link
                key={b.id}
                href={b.href}
                style={{ textDecoration: 'none', display: 'block' }}
                prefetch={false}
              >
                {inner}
              </Link>
            );
          }
          return <div key={b.id}>{inner}</div>;
        })}
      </div>
    );
  } catch {
    return null;
  }
}
