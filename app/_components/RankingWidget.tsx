import type { HomeTodayThaiEarnRankRow } from './home/home-queries';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from '../portal/portal-2026.module.css';

function medalForRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

type Props = {
  rows: HomeTodayThaiEarnRankRow[];
  viewerProfileId: string | null;
  locale: Locale;
  /** 접근성용 heading id (부모에서 유일값 부여) */
  headingId: string;
};

/**
 * 포털·기타 화면 공용 — 당일 타이(THAI) 획득 TOP 5 리스트.
 */
export default function RankingWidget({ rows, viewerProfileId, locale, headingId }: Props) {
  const copy = getPortal2026Copy(locale);
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  return (
    <>
      <h2 id={headingId} className={`${styles.hallCyberTitle} text-base leading-tight`}>
        {copy.balanceHallTitle}
      </h2>
      <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cyan-200/85">
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
                    {row.isWarmup ? (
                      <span className="ml-1 text-[0.6rem] font-normal text-cyan-300/70" title={copy.balanceHallWarmupBadge}>
                        ({copy.balanceHallWarmupBadge})
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.hallCyberBalance}>
                    +{row.thaiEarnedToday.toLocaleString(numLocale)} {copy.thaiSuffix}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
