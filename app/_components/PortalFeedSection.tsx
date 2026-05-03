import Portal2026View from '../portal/Portal2026View';
import {
  fetchCollaborativeMissionsActive,
  fetchHomeTodayThaiEarnRanking,
  type HomeTodayThaiEarnRankRow,
} from './home/home-queries';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
} from '../lib/home/fetchPortalHomeFeed';
import { fetchViewerTodayThaiHallStats } from '@/lib/home/viewerThaiRank';
import { resolveAdminForUser } from '@/lib/admin/resolveAdminAccess';
import { getLocale } from '@/i18n/get-locale';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { ensurePersonalMissionToday } from '@/lib/missions/ensurePersonalMissionToday';
import { loadPortalDailySpark } from '@/lib/portal/loadPortalDailySpark';

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
    const [todayRankRes, feed, viewerHall, collabRes, personalRes, dailySpark] = await Promise.all([
      fetchHomeTodayThaiEarnRanking(5),
      fetchPortalHomeFeed(),
      authSb && viewerProfileId
        ? fetchViewerTodayThaiHallStats(authSb, viewerProfileId)
        : Promise.resolve(null),
      fetchCollaborativeMissionsActive(),
      authSb && viewerProfileId
        ? ensurePersonalMissionToday(authSb, viewerProfileId)
        : Promise.resolve({ row: null, error: null as string | null }),
      loadPortalDailySpark(),
    ]);

    return (
      <Portal2026View
        feed={feed}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        todayThaiEarnRanking={todayRankRes.rows}
        viewerThaiHall={viewerHall}
        viewerProfileId={viewerProfileId}
        collaborativeMissions={collabRes.rows}
        personalMission={personalRes.row}
        dailySpark={dailySpark}
      />
    );
  } catch {
    let balanceRows: HomeTodayThaiEarnRankRow[] = [];
    try {
      balanceRows = (await fetchHomeTodayThaiEarnRanking(5)).rows;
    } catch {
      balanceRows = [];
    }
    const collabRows = (await fetchCollaborativeMissionsActive().catch(() => ({ rows: [] }))).rows;
    let dailySpark = null;
    try {
      dailySpark = await loadPortalDailySpark();
    } catch {
      dailySpark = null;
    }
    let personalMission = null;
    try {
      if (authSb && viewerProfileId) {
        personalMission = (await ensurePersonalMissionToday(authSb, viewerProfileId)).row;
      }
    } catch {
      personalMission = null;
    }
    return (
      <Portal2026View
        feed={HONEST_EMPTY_PORTAL_HOME_FEED}
        locale={locale}
        siteUi={siteUi}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        todayThaiEarnRanking={balanceRows}
        viewerThaiHall={null}
        viewerProfileId={viewerProfileId}
        collaborativeMissions={collabRows}
        personalMission={personalMission}
        dailySpark={dailySpark}
      />
    );
  }
}
