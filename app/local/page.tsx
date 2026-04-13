import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';

export const metadata: Metadata = {
  title: '로컬 가게 — 태자 월드',
  description: '태국 한인·현지 로컬 가게 미니홈. 비회원도 QR로 메뉴·공지·사진을 확인할 수 있어요.',
};

type LocalSpotRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[] | null;
  photo_urls: unknown;
  line_url: string | null;
  minihome_public_slug: string | null;
  updated_at: string;
};

function firstPhoto(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const first = raw.find((v) => typeof v === 'string' && v.trim());
  return typeof first === 'string' ? first : null;
}

async function fetchSpots(): Promise<LocalSpotRow[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('local_spots')
      .select(
        'id,slug,name,description,category,tags,photo_urls,line_url,minihome_public_slug,updated_at',
      )
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(120);

    return (data ?? []) as LocalSpotRow[];
  } catch {
    return [];
  }
}

function SpotCard({
  spot,
  qrEmphasis,
  locale,
}: {
  spot: LocalSpotRow;
  qrEmphasis: boolean;
  locale: 'ko' | 'th';
}) {
  const publicSlug = (spot.minihome_public_slug?.trim() || spot.slug || '').trim();
  const shopHref = `/shop/${encodeURIComponent(publicSlug)}`;
  const abs = `${getSiteBaseUrl()}${shopHref}`;
  const qrHref = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(abs)}`;
  const thumb = firstPhoto(spot.photo_urls);
  return (
    <article className="shop-card">
      <div
        className="shop-card__image"
        style={thumb ? { backgroundImage: `url(${thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {!thumb ? '🏪' : null}
      </div>
      <div className="shop-card__body">
        <span className="shop-card__name">{spot.name}</span>
        <span className="shop-card__category">
          {spot.category}
        </span>
        {spot.description ? <p className="shop-card__desc">{spot.description}</p> : null}
        {Array.isArray(spot.tags) && spot.tags.length > 0 ? (
          <div className="shop-card__tags">
            {spot.tags.slice(0, 4).map((t) => (
              <span key={t} className="shop-card__tag">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Link href={shopHref} className="board-form__submit" style={{ textDecoration: 'none', padding: '6px 12px' }}>
            {locale === 'th' ? 'ดูมินิโฮม' : '미니홈 보기'}
          </Link>
          <a
            href={qrHref}
            target="_blank"
            rel="noopener noreferrer"
            className="board-form__submit"
            style={{
              textDecoration: 'none',
              padding: '6px 12px',
              background: qrEmphasis ? 'rgba(124,58,237,0.12)' : '#fff',
              color: 'var(--tj-ink)',
              border: qrEmphasis ? '1px solid #7c3aed' : '1px solid var(--tj-line)',
              fontWeight: qrEmphasis ? 700 : 500,
            }}
          >
            {qrEmphasis
              ? locale === 'th'
                ? 'เข้า QR ทันที (แนะนำ)'
                : 'QR 바로가기 (추천)'
              : locale === 'th'
                ? 'ดู QR'
                : 'QR 보기'}
          </a>
        </div>
        {spot.line_url?.trim() ? (
          <a href={spot.line_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-block', color: 'var(--tj-link)' }}>
            {locale === 'th' ? 'ติดต่อ LINE' : 'LINE 문의'}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default async function LocalPage() {
  const locale = await getLocale();
  const flags = await getActiveUxFlagsServer();
  const qrEmphasis = Boolean(flags['local.qr_emphasis']?.enabled);
  const spots = await fetchSpots();

  return (
    <div className="page-body">
      <div
        style={{
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#1a2025',
            margin: '0 0 6px',
          }}
        >
          {locale === 'th' ? '🏪 ร้านท้องถิ่น' : '🏪 로컬 가게'}
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          {locale === 'th'
            ? 'มินิโฮมสาธารณะดูได้ทันทีแม้ไม่ใช่สมาชิก สแกน QR เพื่อเปิดเมนูร้าน·รูป·ประกาศได้เลย'
            : '공개 미니홈은 비회원도 바로 볼 수 있어요. QR을 찍어 가게 메뉴판·사진·공지로 바로 들어갈 수 있습니다.'}
        </p>
        {qrEmphasis ? (
          <p style={{ marginTop: 8, color: '#6d28d9', fontSize: '0.82rem', fontWeight: 700 }}>
            {locale === 'th'
              ? 'ตอนนี้เน้นปุ่ม QR เพื่อให้เข้าหน้าเมนูได้เร็วขึ้น'
              : '지금은 QR 진입 버튼을 강조해서 바로 메뉴판으로 들어가기 쉽게 조정했어요.'}
          </p>
        ) : null}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginTop: '16px',
            fontSize: '0.82rem',
            color: '#64748b',
          }}
        >
          <span>
            🏪 {locale === 'th' ? 'ทั้งหมด' : '전체'}{' '}
            <strong style={{ color: '#1a2025' }}>{spots.length}</strong>
            {locale === 'th' ? ' ร้าน' : '개'}
          </span>
        </div>
      </div>

      {spots.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</p>
          <p>{locale === 'th' ? 'ยังไม่มีมินิโฮมสาธารณะ' : '아직 공개된 로컬 미니홈이 없습니다.'}</p>
        </div>
      ) : (
        <div className="shop-grid">
          {spots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} qrEmphasis={qrEmphasis} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
