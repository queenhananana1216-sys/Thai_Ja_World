import GuestGateLink from '@app/_components/GuestGateLink';
import RankingWidget from '@app/_components/RankingWidget';
import type { HomeTodayThaiEarnRankRow } from '../_components/home/home-queries';
import type { ViewerTodayThaiHall } from '@/lib/home/viewerThaiRank';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

export default function PortalThaiHallOfFame({
  rows,
  viewer,
  viewerProfileId,
  isLoggedIn,
  locale,
  instanceId = 'main',
}: {
  rows: HomeTodayThaiEarnRankRow[];
  viewer: ViewerTodayThaiHall | null;
  viewerProfileId: string | null;
  isLoggedIn: boolean;
  locale: Locale;
  /** 모바일·우측 동시 마운트 시 heading id 충돌 방지 */
  instanceId?: string;
}) {
  const copy = getPortal2026Copy(locale);
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';
  const headingId = `tj-balance-hall-h-${instanceId}`;

  return (
    <section
      className={`${styles.glassCyberHall} overflow-hidden p-2.5`}
      aria-labelledby={headingId}
    >
      <RankingWidget rows={rows} viewerProfileId={viewerProfileId} locale={locale} headingId={headingId} />

      <div className="mt-2 border-t border-cyan-500/20 pt-2">
        {isLoggedIn && viewer ? (
          <div className={`${styles.hallCyberYou} flex flex-col gap-1.5`}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-cyan-100">
                ฿ {viewer.balance.toLocaleString(numLocale)} {copy.thaiSuffix}
              </span>
              <span className="text-slate-200/90">
                {copy.balanceHallYouToday}{' '}
                <span className="font-bold text-white">
                  +{viewer.todayEarned.toLocaleString(numLocale)}
                </span>
              </span>
            </div>
            {viewer.todayRank != null && viewer.todayEarned > 0 ? (
              <div className="text-xs text-violet-200/95">
                {copy.balanceHallTodayRankPrefix} #{viewer.todayRank.toLocaleString(numLocale)}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-[0.7rem] font-semibold text-slate-300/90">{copy.balanceHallLoginHint}</p>
        )}
        <GuestGateLink
          href="/community/boards"
          isLoggedIn={isLoggedIn}
          className="mt-1.5 flex min-h-10 w-full items-center justify-center rounded-lg border border-cyan-400/35 bg-slate-950/50 text-center text-xs font-extrabold text-cyan-50 transition hover:border-indigo-400/45 hover:bg-indigo-950/35 hover:text-indigo-100"
        >
          {copy.balanceHallWriteCta}
        </GuestGateLink>
      </div>
    </section>
  );
}
