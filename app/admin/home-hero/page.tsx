import { createServiceRoleClient } from '@/lib/supabase/admin';
import { defaultLandingPageCopyJsonString } from '@/lib/landing/landingPageCopyDefaultPayload';
import {
  adminHomeSiteCopyInitialRecord,
  getMergedDefaultsFromI18n,
  SITE_COPY_HOME_KEYS,
} from '@/lib/siteCopy/heroCopyDefaults';
import { HomeHeroCopyForm } from './_components/HomeHeroCopyForm';

export default async function AdminHomeHeroPage() {
  const defaults = getMergedDefaultsFromI18n();
  const initial = adminHomeSiteCopyInitialRecord(defaults);
  const landingJsonDefault = defaultLandingPageCopyJsonString();
  initial['home_landing_sections:ko'] = landingJsonDefault;

  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from('site_copy')
      .select('key, locale, value')
      .in('key', [...SITE_COPY_HOME_KEYS]);

    for (const row of data ?? []) {
      const k = `${row.key}:${row.locale}`;
      if (k in initial && typeof row.value === 'string' && row.value.trim()) {
        initial[k] = row.value;
      }
    }
  } catch {
    /* 테이블 없음·키 오류 시 기본값만 */
  }

  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">홈 메인 문구</h1>
      <p className="admin-dash__lead">
        메인 웹 페이지(홈)에 보이는 문구를 한국어·태국어 UI 각각 수정할 수 있습니다. 위쪽은 히어로(태그·브랜드·제목·본문·미니홈
        티저 박스),
        아래는 비회원 안내 카드와 «한 줄 제보» 띠 제목·각주입니다. 비우고 저장하면 코드 기본값(i18n)으로 돌아갑니다.
        저장은 <code>public.site_copy</code> 테이블에 반영됩니다(마이그레이션 <code>035_site_copy_public_strings</code>).
        저장 직후 서버 캐시를 무효화하므로, 홈을 새로고침하면 바로 보여야 합니다.
      </p>
      <HomeHeroCopyForm
        initial={initial}
        defaultsHint={defaults}
        defaultLandingPageCopyJson={landingJsonDefault}
      />
    </main>
  );
}
