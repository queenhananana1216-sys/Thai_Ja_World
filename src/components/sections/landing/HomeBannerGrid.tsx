import { BannerCard } from '@/components/banners/BannerCard';
import { listPremiumBanners } from '@/lib/banners/listPremiumBanners';
import { portWidgetHeaderSub, portWidgetHeaderTitle } from '@/lib/landing/portalWidgetStyle';
import type { Locale } from '@/i18n/types';
import { getDictionary } from '@/i18n/dictionaries';

/**
 * 홈 "파트너·스폰서 그리드" — Philgo 메인의 2×3 광고 배너에 대응.
 *
 * 데이터 소스: public.premium_banners
 *   placement = 'home_strip', route_group ∈ { 'home', 'all' }, 활성·기간 내.
 *
 * 운영: 관리자 /admin/premium-banners 에서 placement=홈 스트립, 노출 범위=홈 으로 CRUD.
 *
 * 깨짐 방지: 배너 0개면 섹션 자체 렌더 X. DOM 이 비어 공간만 잡히는 일이 없다.
 * 레이아웃: 모바일 2열 · sm 3열 · lg 4열 → 아이템 수에 맞춰 자연스럽게 채움.
 */

type Props = {
  locale: Locale;
  variant?: 'dark' | 'light';
  /** `light`일 때 서버에서 `getDictionary` */
  dictionary?: ReturnType<typeof getDictionary>;
};

export async function HomeBannerGrid({ locale, variant = 'dark', dictionary }: Props) {
  const byPlacement = await listPremiumBanners({
    placements: ['home_strip'],
    routeGroups: ['home'],
    limitPerPlacement: 12,
  });
  const items = byPlacement.home_strip;
  if (!items.length) return null;

  const d = dictionary ?? getDictionary(locale);
  const title = d.home.partnerStripTitle;
  const sub = d.home.partnerStripSub;

  return (
    <section
      aria-labelledby="tj-home-banner-grid"
      className={variant === 'light' ? 'mt-0' : undefined}
      style={{
        marginTop: variant === 'light' ? 0 : 32,
        marginBottom: 8,
      }}
    >
      <div className="mb-2" style={variant === 'light' ? undefined : { marginBottom: 14 }}>
        <h2
          id="tj-home-banner-grid"
          className={variant === 'light' ? portWidgetHeaderTitle : undefined}
          style={
            variant === 'light'
              ? { margin: 0 }
              : {
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: '#f8fafc',
          }
          }
        >
          {title}
        </h2>
        <p
          className={variant === 'light' ? portWidgetHeaderSub : undefined}
          style={variant === 'light' ? { margin: '2px 0 0' } : { margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}
        >
          {sub}
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html:
            variant === 'light'
              ? `
            .tj-home-banner-grid--light {
              display: grid;
              gap: 8px;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            @media (min-width: 640px) {
              .tj-home-banner-grid--light { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (min-width: 1024px) {
              .tj-home-banner-grid--light { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            }
          `
              : `
            .tj-home-banner-grid {
              display: grid;
              gap: 10px;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            @media (min-width: 640px) {
              .tj-home-banner-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            @media (min-width: 1024px) {
              .tj-home-banner-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
            }
            .tj-home-banner-grid .tj-banner-card {
              max-width: 100% !important;
              background: rgba(15,17,40,0.7) !important;
              border-color: rgba(255,255,255,0.08) !important;
              color: #f1f5f9 !important;
            }
            .tj-home-banner-grid .tj-banner-card p {
              color: #f1f5f9 !important;
            }
            .tj-home-banner-grid .tj-banner-card p + p {
              color: #94a3b8 !important;
            }
          `,
        }}
      />

      <div
        className={variant === 'light' ? 'tj-home-banner-grid tj-home-banner-grid--light' : 'tj-home-banner-grid'}
      >
        {items.map((b) => (
          <BannerCard key={b.id} banner={b} fallbackAspect="4 / 3" maxWidth={999} />
        ))}
      </div>
    </section>
  );
}
