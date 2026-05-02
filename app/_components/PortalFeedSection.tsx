import { unstable_noStore as noStore } from 'next/cache';
import Portal2026View from '../portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
} from '../lib/home/fetchPortalHomeFeed';
import { resolveAdminForUser } from '@/lib/admin/resolveAdminAccess';
import { getLocale } from '@/i18n/get-locale';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

/** 홈 SSR 페치 전용 — 부모 `Suspense`가 즉시 폴백을 보여준 뒤 이 컴포넌트가 치환 */
export default async function PortalFeedSection() {
  noStore();
  const locale = await getLocale();
  const siteUi = await loadSiteUiSettings();
  let isLoggedIn = false;
  let isAdmin = false;
  try {
    const authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await authSb.auth.getUser();
    isLoggedIn = Boolean(user?.id);
    if (user?.id) {
      const gate = await resolveAdminForUser(authSb, user.id, user.email);
      isAdmin = Boolean(gate);
    }
  } catch {
    isLoggedIn = false;
    isAdmin = false;
  }
  try {
    const feed = await fetchPortalHomeFeed();
    return (
      <Portal2026View
        feed={feed}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
      />
    );
  } catch {
    return (
      <Portal2026View
        feed={HONEST_EMPTY_PORTAL_HOME_FEED}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
      />
    );
  }
}
