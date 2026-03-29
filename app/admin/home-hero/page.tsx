import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getMergedDefaultsFromI18n, HERO_SITE_COPY_KEYS } from '@/lib/siteCopy/heroCopyDefaults';
import { HomeHeroCopyForm } from './_components/HomeHeroCopyForm';

export default async function AdminHomeHeroPage() {
  const defaults = getMergedDefaultsFromI18n();
  const initial: Record<string, string> = {
    'home_hero_brand_tai:ko': defaults.brandTai,
    'home_hero_brand_mid:ko': defaults.brandMid,
    'home_hero_brand_suffix:ko': defaults.brandSuffix,
    'home_hero_title:ko': defaults.titleKo,
    'home_hero_title:th': defaults.titleTh,
    'home_hero_tag:ko': defaults.tagKo,
    'home_hero_tag:th': defaults.tagTh,
    'home_hero_kicker:ko': defaults.heroKickerKo,
    'home_hero_kicker:th': defaults.heroKickerTh,
    'home_hero_lead:ko': defaults.heroLeadKo,
    'home_hero_lead:th': defaults.heroLeadTh,
    'home_hero_sub:ko': defaults.heroSubKo,
    'home_hero_sub:th': defaults.heroSubTh,
  };

  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from('site_copy')
      .select('key, locale, value')
      .in('key', [...HERO_SITE_COPY_KEYS]);

    for (const row of data ?? []) {
      const k = `${row.key}:${row.locale}`;
      if (k in initial && typeof row.value === 'string') {
        initial[k] = row.value;
      }
    }
  } catch {
    /* 테이블 없음·키 오류 시 기본값만 */
  }

  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">홈 히어로 문구</h1>
      <p className="admin-dash__lead">
        홈 히어로 상단(태그·보라 브랜드·제목·키워드 줄·강조 한 줄·본문)을 한·태 각각 수정할 수 있습니다. 브랜드는 세 칸으로
        나눠 «태국에 살자» 스타일을 유지합니다. 비우고 저장하면 코드에 넣어 둔 기본 문구로 돌아갑니다.
      </p>
      <HomeHeroCopyForm initial={initial} defaultsHint={defaults} />
    </main>
  );
}
