/**
 * app/local/page.tsx — 로컬 가게 디렉터리 목록
 *
 * - local_spots: 운영 등록 + 미니홈(/shop/슬러그) 링크
 * - local_businesses: 기존 큐레이션 카드(/local/슬러그)
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import type { LocalBusiness } from '@/types/taeworld';

export const metadata: Metadata = {
  title: '로컬 가게 — 태자 월드',
  description: '태국 한인·현지 로컬 가게 디렉터리. 미니홈, 메뉴, 방명록, 공지 안내.',
};

// ── 데이터 패치 ────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { premium: 0, standard: 1, basic: 2 };

const SPOT_CATEGORY_LABEL: Record<string, string> = {
  restaurant: '맛집·식당',
  cafe: '카페',
  night_market: '야시장·길거리',
  massage: '마사지·스파',
  service: '서비스',
  shopping: '쇼핑',
  other: '기타',
};

type PublishedLocalSpot = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  photo_urls: unknown;
  minihome_public_slug: string | null;
};

async function fetchPublishedLocalSpots(): Promise<PublishedLocalSpot[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('local_spots')
      .select('id, name, description, category, photo_urls, minihome_public_slug')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(48);
    return (data ?? []) as PublishedLocalSpot[];
  } catch {
    return [];
  }
}

async function fetchBusinesses(): Promise<{
  businesses: LocalBusiness[];
  regions: string[];
}> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('local_businesses')
      .select(
        'id, slug, name, category, region, description, image_url, emoji, tier, is_recommended, has_discount, discount, tags',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60);

    const businesses = (data ?? [])
      .map((b) => b as unknown as LocalBusiness)
      .sort((a, b) => {
        // tier 우선, 같으면 is_recommended, 같으면 이름 가나다
        const tierDiff = (TIER_RANK[a.tier] ?? 2) - (TIER_RANK[b.tier] ?? 2);
        if (tierDiff !== 0) return tierDiff;
        if (a.is_recommended !== b.is_recommended)
          return a.is_recommended ? -1 : 1;
        return a.name.localeCompare(b.name, 'ko');
      });

    const regions = Array.from(new Set(businesses.map((b) => b.region))).sort();
    return { businesses, regions };
  } catch {
    return { businesses: [], regions: [] };
  }
}

// ── 서브컴포넌트 ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: LocalBusiness['tier'] }) {
  if (tier === 'basic') return null;
  return (
    <span className={`badge badge-${tier}`}>
      {tier === 'premium' ? '⭐ 프리미엄' : '스탠다드'}
    </span>
  );
}

function firstSpotPhoto(photo_urls: unknown): string | null {
  if (!Array.isArray(photo_urls) || photo_urls.length === 0) return null;
  const u = String(photo_urls[0]).trim();
  return u || null;
}

function LocalSpotMinihomeCard({ spot }: { spot: PublishedLocalSpot }) {
  const img = firstSpotPhoto(spot.photo_urls);
  const catLabel = SPOT_CATEGORY_LABEL[spot.category] ?? spot.category;
  const href = spot.minihome_public_slug ? `/shop/${spot.minihome_public_slug}` : null;

  const body = (
    <>
      <div
        className="shop-card__image"
        style={
          img
            ? {
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      >
        {!img ? '🏪' : null}
      </div>
      <div className="shop-card__body">
        <span className="shop-card__name">{spot.name}</span>
        <span className="shop-card__category">{catLabel}</span>
        {spot.description ? <p className="shop-card__desc">{spot.description}</p> : null}
        {!href ? (
          <span className="badge" style={{ marginTop: 6, display: 'inline-block' }}>
            미니홈 주소 준비 중
          </span>
        ) : (
          <span style={{ marginTop: 8, display: 'block', fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600 }}>
            미니홈 보기 →
          </span>
        )}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className="shop-card">
      {body}
    </Link>
  ) : (
    <div className="shop-card" style={{ cursor: 'default' }}>
      {body}
    </div>
  );
}

function ShopCard({ shop }: { shop: LocalBusiness }) {
  return (
    <Link href={`/local/${shop.slug}`} className="shop-card">
      {/* 이미지 or 이모지 */}
      <div
        className="shop-card__image"
        style={
          shop.image_url
            ? {
                backgroundImage: `url(${shop.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      >
        {!shop.image_url && shop.emoji}
      </div>

      {/* 바디 */}
      <div className="shop-card__body">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span className="shop-card__name">{shop.name}</span>
        </div>

        {/* 뱃지 row */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          <TierBadge tier={shop.tier} />
          {shop.is_recommended && (
            <span className="badge badge-recommended">👍 추천</span>
          )}
          {shop.has_discount && (
            <span className="badge badge-discount">🏷️ 할인</span>
          )}
        </div>

        <span className="shop-card__category">
          {shop.category} · {shop.region}
        </span>

        {shop.description && (
          <p className="shop-card__desc">{shop.description}</p>
        )}

        {shop.has_discount && shop.discount && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.78rem',
              color: '#dc2626',
              fontWeight: 600,
            }}
          >
            {shop.discount}
          </p>
        )}

        {shop.tags.length > 0 && (
          <div className="shop-card__tags">
            {shop.tags.slice(0, 4).map((t) => (
              <span key={t} className="shop-card__tag">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── 지역별 그룹 뷰 ─────────────────────────────────────────────────────────

function RegionGroup({
  region,
  shops,
}: {
  region: string;
  shops: LocalBusiness[];
}) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--tj-link)',
          borderLeft: '4px solid #e8a838',
          paddingLeft: '10px',
          margin: '0 0 14px',
        }}
      >
        📍 {region}
        <span
          style={{
            marginLeft: '8px',
            fontWeight: 400,
            fontSize: '0.82rem',
            color: '#94a3b8',
          }}
        >
          {shops.length}개
        </span>
      </h2>
      <div className="shop-grid">
        {shops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    </section>
  );
}

// ── 페이지 ─────────────────────────────────────────────────────────────────

export default async function LocalPage() {
  const [{ businesses, regions }, spots] = await Promise.all([
    fetchBusinesses(),
    fetchPublishedLocalSpots(),
  ]);

  return (
    <div className="page-body">
      {/* 페이지 헤더 */}
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
          🏪 로컬 가게
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          태국 현지 한인·로컬 가게 — 미니홈·메뉴·방명록과 큐레이션 가게 목록
        </p>

        {/* 통계 바 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            marginTop: '16px',
            fontSize: '0.82rem',
            color: '#64748b',
          }}
        >
          <span>
            🌐 미니홈 가게{' '}
            <strong style={{ color: '#1a2025' }}>{spots.length}</strong>곳
          </span>
          <span>
            🏪 디렉터리 카드{' '}
            <strong style={{ color: '#1a2025' }}>{businesses.length}</strong>개
          </span>
          <span>
            ⭐ 프리미엄{' '}
            <strong style={{ color: '#1a2025' }}>
              {businesses.filter((b) => b.tier === 'premium').length}
            </strong>
            개
          </span>
          <span>
            👍 추천{' '}
            <strong style={{ color: '#1a2025' }}>
              {businesses.filter((b) => b.is_recommended).length}
            </strong>
            개
          </span>
        </div>
      </div>

      {/* 운영 등록 미니홈 (local_spots) */}
      {spots.length > 0 ? (
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--tj-link)',
              borderLeft: '4px solid #7c3aed',
              paddingLeft: '10px',
              margin: '0 0 14px',
            }}
          >
            🌐 가게 미니홈
            <span
              style={{
                marginLeft: '8px',
                fontWeight: 400,
                fontSize: '0.82rem',
                color: '#94a3b8',
              }}
            >
              {spots.length}곳
            </span>
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>
            사장님이 소개·메뉴·사진·방명록을 관리하는 공개 페이지입니다. 가게마다 주소가 다릅니다.
          </p>
          <div className="shop-grid">
            {spots.map((s) => (
              <LocalSpotMinihomeCard key={s.id} spot={s} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 큐레이션 가게 (local_businesses) */}
      {businesses.length > 0 ? (
        regions.length > 1 ? (
          <>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--tj-link)',
                borderLeft: '4px solid #e8a838',
                paddingLeft: '10px',
                margin: '0 0 14px',
              }}
            >
              📋 지역별 가게 카드
            </h2>
            {regions.map((region) => {
              const regionShops = businesses.filter((b) => b.region === region);
              if (regionShops.length === 0) return null;
              return (
                <RegionGroup key={region} region={region} shops={regionShops} />
              );
            })}
          </>
        ) : (
          <>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--tj-link)',
                borderLeft: '4px solid #e8a838',
                paddingLeft: '10px',
                margin: '0 0 14px',
              }}
            >
              📋 디렉터리 가게
            </h2>
            <div className="shop-grid">
              {businesses.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          </>
        )
      ) : null}

      {spots.length === 0 && businesses.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</p>
          <p>아직 목록에 올라온 가게가 없습니다.</p>
          <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            미니홈 가게는 운영 승인 후 이 페이지에 표시됩니다.
          </p>
        </div>
      ) : null}

      {/* 가게 등록 안내 */}
      <div
        className="card"
        style={{
          marginTop: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: '#eff6ff',
          borderColor: '#bfdbfe',
        }}
      >
        <span style={{ fontSize: '2rem' }}>📣</span>
        <div>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--tj-link)',
            }}
          >
            가게 등록 안내
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.82rem',
              color: '#475569',
            }}
          >
            입점 문의는 운영진에게 연락해 주세요. 승인되면 대표 계정으로{' '}
            <Link href="/my-local-shop" style={{ color: 'var(--tj-link)', fontWeight: 600 }}>
              내 가게 관리
            </Link>
            에서 미니홈·메뉴·갤러리·방명록을 다룰 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
