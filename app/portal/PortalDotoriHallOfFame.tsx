import GuestGateLink from '@app/_components/GuestGateLink';
import type { HomeDotoriBalanceRankRow } from '../_components/home/home-queries';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

function medalForRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

export default function PortalDotoriHallOfFame({
  rows,
  viewer,
  viewerProfileId,
  isLoggedIn,
  locale,
  instanceId = 'main',
}: {
  rows: HomeDotoriBalanceRankRow[];
  viewer: { rank: number; balance: number } | null;
  viewerProfileId: string | null;
  isLoggedIn: boolean;
  locale: Locale;
  /** 모바일·우측 동시 마운트 시 heading id 충돌 방지 */
  instanceId?: string;
}) {
  const copy = getPortal2026Copy(locale);
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  return (
    <section
      className={`${styles.glassCyberHall} overflow-hidden p-2.5`}
      aria-labelledby={`tj-balance-hall-h-${instanceId}`}
    >
      <h2
        id={`tj-balance-hall-h-${instanceId}`}
        className={`${styles.hallCyberTitle} text-base leading-tight`}
      >
        {copy.balanceHallTitle}
      </h2>
      <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-fuchsia-200/90">
        {copy.balanceHallSub}
      </p>

      {(rows?.length ?? 0) === 0 ? (
        <p className="mt-2 text-sm text-slate-300">{copy.balanceHallEmpty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5" role="list">
          {rows.map((row) => {
            const top3 = row.rank <= 3;
            const isYou =
              Boolean(viewerProfileId) && row.profileId && viewerProfileId === row.profileId;
            return (
              <li
                key={row.profileId || `r-${row.rank}`}
                className={`${styles.hallCyberRow} ${top3 ? styles.hallCyberRowTop : ''}`}
              >
                <span className={styles.hallCyberMedal} aria-hidden>
                  {medalForRank(row.rank)}
                </span>
                <div className={styles.hallCyberMeta}>
                  <span className={styles.hallCyberName} title={row.displayName}>
                    {row.displayName}
                    {isYou ? ' · YOU' : ''}
                  </span>
                  <span className={styles.hallCyberBalance}>
                    {row.dotoriBalance.toLocaleString(numLocale)} {copy.dotoriSuffix}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 border-t border-cyan-500/20 pt-2">
        {isLoggedIn && viewer ? (
          <div className={styles.hallCyberYou}>
            <span className="text-cyan-100">{copy.balanceHallYourRank}</span>
            <span className="mx-1 text-fuchsia-300">#{viewer.rank.toLocaleString(numLocale)}</span>
            <span className="text-slate-300">·</span>
            <span className="ml-1 text-white">
              {viewer.balance.toLocaleString(numLocale)} {copy.dotoriSuffix}
            </span>
          </div>
        ) : (
          <p className="text-center text-[0.7rem] font-semibold text-fuchsia-200/85">{copy.balanceHallLoginHint}</p>
        )}
        <GuestGateLink
          href="/community/boards"
          isLoggedIn={isLoggedIn}
          className="mt-1.5 flex min-h-10 w-full items-center justify-center rounded-lg border border-fuchsia-500/35 bg-fuchsia-950/40 text-center text-xs font-extrabold text-fuchsia-100 transition hover:border-cyan-400/50 hover:bg-cyan-950/30 hover:text-cyan-100"
        >
          {copy.balanceHallWriteCta}
        </GuestGateLink>
      </div>
    </section>
  );
}
