'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/types';
import styles from './portal-2026.module.css';

export type TrendingTickerItem = { rank: number; query: string; count: number };

type PortalTrendingTickerProps = {
  items: TrendingTickerItem[];
  title: string;
  emptyLabel: string;
  locale: Locale;
};

export default function PortalTrendingTicker({ items, title, emptyLabel, locale }: PortalTrendingTickerProps) {
  const safe = useMemo(
    () =>
      items.filter((x) => x && typeof x.query === 'string' && x.query.trim().length > 0).slice(0, 10),
    [items],
  );
  const [idx, setIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || safe.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % safe.length);
    }, 3000);
    return () => window.clearInterval(t);
  }, [reduceMotion, safe.length]);

  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';
  const cur = safe.length ? safe[reduceMotion ? 0 : idx] : null;

  return (
    <div className={styles.tickerBar} role="region" aria-label={title}>
      <div className={styles.tickerInner}>
        <span className={styles.tickerBadge} aria-hidden>
          🔥
        </span>
        <span className={styles.tickerTitle}>{title}</span>
        <div className={styles.tickerViewport}>
          {cur ? (
            <div
              key={`${cur.rank}-${cur.query}-${idx}`}
              className={reduceMotion ? styles.tickerLineStatic : styles.tickerLineEnter}
            >
              <span className={styles.tickerRank}>#{cur.rank}</span>
              <span className={styles.tickerQuery}>{cur.query}</span>
              <span className={styles.tickerCount}>
                {locale === 'th' ? `${cur.count.toLocaleString(numLocale)} ครั้ง` : `${cur.count.toLocaleString(numLocale)}회`}
              </span>
            </div>
          ) : (
            <div className={styles.tickerLineStatic}>
              <span className={styles.tickerMuted}>{emptyLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
