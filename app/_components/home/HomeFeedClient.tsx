'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeUnifiedFeedItem } from './home-feed-types';
import { thumbGradientForId } from '../../portal/thumb';
import { portalMetaLine } from '../../portal/text';
import { categoryLabel, type PostCategorySlug } from '@/lib/community/postCategories';
import { formatDate } from '@/lib/utils/formatDate';
import { getPerceivedViewCount } from '@/lib/utils';
import styles from './home-hub.module.css';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';
import { normalizeContainerText } from '@/lib/text/normalizeDisplayText';

const MAX_BATCHES = 8;
type HomeRecommendedRow = { id: string; title: string; href: string; score: number };

function itemHref(item: HomeUnifiedFeedItem): string {
  if (item.kind === 'job') return '/community/boards?cat=job';
  if (item.kind === 'market') return '/community/boards?cat=flea';
  return `/community/boards/${item.id}`;
}

function itemPillLabel(item: HomeUnifiedFeedItem): string {
  if (item.kind === 'job') return categoryLabel('job', 'ko');
  if (item.kind === 'market') return categoryLabel('flea', 'ko');
  return categoryLabel((item.category || 'free') as PostCategorySlug, 'ko');
}

function pillClass(item: HomeUnifiedFeedItem): string {
  const p = styles.pill as string;
  if (item.kind === 'job') return `${p} ${styles.pillJob as string}`;
  if (item.kind === 'market') return `${p} ${styles.pillMarket as string}`;
  if (item.category === 'free') return `${p} ${styles.pillFree as string}`;
  return p;
}

export function HomeFeedClient({
  initialItems,
  initialError,
  personalizedRows,
}: {
  initialItems: HomeUnifiedFeedItem[];
  initialError: string | null;
  personalizedRows: HomeRecommendedRow[];
}) {
  const [items, setItems] = useState(initialItems ?? []);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState(0);
  const [err, setErr] = useState<string | null>(initialError);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lock = useRef(false);

  const last = (items ?? []).length > 0 ? items[(items ?? []).length - 1] : null;

  const loadMore = useCallback(async () => {
    if (lock.current || batches >= MAX_BATCHES || !last) return;
    lock.current = true;
    setLoading(true);
    setErr(null);
    try {
      const u = new URL('/api/home/feed', window.location.origin);
      u.searchParams.set('before', last.created_at);
      u.searchParams.set('before_id', last.id);
      u.searchParams.set('limit', '14');
      const res = await fetch(u.toString());
      const json = (await res.json()) as {
        ok: boolean;
        items?: HomeUnifiedFeedItem[];
        error?: string;
      };
      if (!json.ok || !Array.isArray(json.items)) {
        setErr(json.error ?? '추가 로드 실패');
        return;
      }
      if (json.items.length === 0) {
        setBatches(MAX_BATCHES);
        return;
      }
      setItems((prev) => {
        const base = prev ?? [];
        const seen = new Set(base.map((p) => `${p.kind}:${p.id}`));
        const next = json.items!.filter((p) => !seen.has(`${p.kind}:${p.id}`));
        return [...base, ...next];
      });
      setBatches((c) => c + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setLoading(false);
      lock.current = false;
    }
  }, [batches, last]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: '120px', threshold: 0 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [loadMore]);

  return (
    <section className={styles.feed} id="home-community-feed" aria-labelledby="home-feed-h">
      <h2 className={`${styles.feedHead} text-sm font-semibold text-slate-200`} id="home-feed-h">
        라이브
      </h2>

      {(items ?? []).length === 0 && !err ? (
        <div className="p-2">
          <HomeGlassEmptyState label="라이브 피드 빈 상태" />
        </div>
      ) : null}

      <div className={styles.feedGrid}>
        {(personalizedRows ?? []).length > 0 ? (
          <section className={styles.curationCard} aria-label="당신을 위한 맞춤 정보">
            <h3 className={styles.curationHead}>💡 당신을 위한 맞춤 정보</h3>
            <ul className={styles.curationList}>
              {(personalizedRows ?? []).map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className={styles.curationRow}>
                    <span className={`${styles.curationTitle} line-clamp-1`}>{normalizeContainerText(row.title, 72)}</span>
                    <span className={styles.curationScore}>점수 {row.score}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {(items ?? []).map((p) => {
          const thumbUrl = p.image_url;
          const preview = portalMetaLine({ excerpt: p.excerpt, content: null }, 100);
          return (
            <Link key={`${p.kind}-${p.id}`} href={itemHref(p)} className={styles.feedRow}>
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.thumb} src={thumbUrl} alt="" width={36} height={36} />
              ) : (
                <div
                  className={styles.thumbPh}
                  style={{ background: thumbGradientForId(`${p.kind}-${p.id}`) }}
                  aria-hidden
                />
              )}
              <div className="min-w-0 space-y-1.5">
                <div className="min-w-0 truncate">
                  <span className={`${pillClass(p)} text-[11px]`}>{itemPillLabel(p)}</span>
                  <span className={`${styles.feedMetaMuted} text-[11px]`}>
                    댓글 {p.comment_count} · 👀{' '}
                    {getPerceivedViewCount(Number(p.view_count ?? 0), `${p.kind}-${p.id}`).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className={`${styles.feedTitle} line-clamp-1 text-sm font-semibold text-slate-200`}>{p.title}</div>
                <p className={`${styles.feedEx} line-clamp-2 text-[11px] text-slate-400 leading-snug`}>{preview}</p>
                <div className={`${styles.feedFoot} text-[11px] text-slate-400 leading-snug`}>{formatDate(p.created_at)}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {err ? (
        <div className="p-2" role="status">
          <HomeGlassEmptyState label="라이브 피드 빈 상태" />
        </div>
      ) : null}

      <div className={styles.loadMore} ref={sentinelRef} role="status" aria-busy={loading}>
        {batches >= MAX_BATCHES ? '—' : loading ? '…' : '\u00a0'}
      </div>
    </section>
  );
}
