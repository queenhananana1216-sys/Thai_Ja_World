import Portal2026View from '../portal/Portal2026View';
import {
  fetchHomeDotoriBalanceRanking,
  type HomeDotoriBalanceRankRow,
} from './home/home-queries';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
} from '../lib/home/fetchPortalHomeFeed';
import { fetchViewerDotoriBalanceRank } from '@/lib/home/viewerDotoriRank';
import { resolveAdminForUser } from '@/lib/admin/resolveAdminAccess';
import { getLocale } from '@/i18n/get-locale';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

/** 홈 SSR 페치 전용 — 부모 `Suspense`가 즉시 폴백을 보여준 뒤 이 컴포넌트가 치환 */
export default async function PortalFeedSection() {
  const locale = await getLocale();
  const siteUi = await loadSiteUiSettings();
  let isLoggedIn = false;
  let isAdmin = false;
  let viewerProfileId: string | null = null;
  let authSb: Awaited<ReturnType<typeof createServerSupabaseAuthClient>> | null = null;

  try {
    authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await authSb.auth.getUser();
    isLoggedIn = Boolean(user?.id);
    if (user?.id) {
      viewerProfileId = user.id;
      const gate = await resolveAdminForUser(authSb, user.id, user.email);
      isAdmin = Boolean(gate);
    }
  } catch {
    isLoggedIn = false;
    isAdmin = false;
    viewerProfileId = null;
    authSb = null;
  }

  try {
    const [balanceRes, feed, viewerDotori] = await Promise.all([
      fetchHomeDotoriBalanceRanking(5),
      fetchPortalHomeFeed(),
      authSb && viewerProfileId
        ? fetchViewerDotoriBalanceRank(authSb, viewerProfileId)
        : Promise.resolve(null),
    ]);

    return (
      <Portal2026View
        feed={feed}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        dotoriBalanceRanking={balanceRes.rows}
        viewerDotori={viewerDotori}
        viewerProfileId={viewerProfileId}
      />
    );
  } catch {
    let balanceRows: HomeDotoriBalanceRankRow[] = [];
    try {
      balanceRows = (await fetchHomeDotoriBalanceRanking(5)).rows;
    } catch {
      balanceRows = [];
    }
    return (
      <Portal2026View
        feed={HONEST_EMPTY_PORTAL_HOME_FEED}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        dotoriBalanceRanking={balanceRows}
        viewerDotori={null}
        viewerProfileId={viewerProfileId}
      />
    );
  }
}
