/**
 * app/local/page.tsx — 로컬 가게 디렉터리 목록
 *
 * 서버 컴포넌트: Supabase anon key 로 local_businesses 읽기.
 * tier 순(premium > standard > basic), is_recommended 우선 정렬.
 * RLS: businesses_select_all 정책으로 공개 SELECT 허용.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import type { LocalBusiness } from '@/types/taeworld';

export const metadata: Metadata = {
  title: '로컬 가게 — 태자 월드',
  description: '태국 한인·현지 로컬 가게 디렉터리. 가게 멤버 정보, 공지, 특별 메뉴.',
};

// ── 데이터 패치 ────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { premium: 0, standard: 1, basic: 2 };

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
  const { businesses, regions } = await fetchBusinesses();

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
          태국 현지 한인·로컬 가게 디렉터리 — 공지, 특별 메뉴, 영업시간 안내
        </p>

        {/* 통계 바 */}
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
            🏪 전체{' '}
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

      {/* 가게 목록 */}
      {businesses.length > 0 ? (
        regions.length > 1 ? (
          // 지역이 2개 이상이면 지역별 그룹
          regions.map((region) => {
            const regionShops = businesses.filter((b) => b.region === region);
            if (regionShops.length === 0) return null;
            return (
              <RegionGroup key={region} region={region} shops={regionShops} />
            );
          })
        ) : (
          // 지역이 1개 이하면 단순 그리드
          <div className="shop-grid">
            {businesses.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )
      ) : (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</p>
          <p>아직 등록된 가게가 없습니다.</p>
          <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            가게 등록 기능은 Phase 2에서 오픈될 예정입니다.
          </p>
        </div>
      )}

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
            내 가게를 태자 월드에 등록하고 싶으신가요? 공지·특별 메뉴·영업시간을  
            직접 올릴 수 있는 미니홈 기능이 곧 오픈됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
