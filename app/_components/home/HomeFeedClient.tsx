'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeUnifiedFeedItem } from './home-feed-types';
import { thumbGradientForId } from '../../portal/thumb';
import { portalMetaLine } from '../../portal/text';
import { categoryLabel, type PostCategorySlug } from '@/lib/community/postCategories';
import { formatDate } from '@/lib/utils/formatDate';
import styles from './home-hub.module.css';

const MAX_BATCHES = 8;

function itemHref(item: HomeUnifiedFeedItem): string {
  if (item.kind === 'job') return `/jobs/${item.id}`;
  if (item.kind === 'market') return `/market/${item.id}`;
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
}: {
  initialItems: HomeUnifiedFeedItem[];
  initialError: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState(0);
  const [err, setErr] = useState<string | null>(initialError);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lock = useRef(false);

  const last = items.length > 0 ? items[items.length - 1] : null;

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
        const seen = new Set(prev.map((p) => `${p.kind}:${p.id}`));
        const next = json.items!.filter((p) => !seen.has(`${p.kind}:${p.id}`));
        return [...prev, ...next];
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
      <h2 className={styles.feedHead} id="home-feed-h">
        라이브
      </h2>

      {items.length === 0 && !err ? <div className={styles.feedEmpty} aria-hidden /> : null}

      <div className={styles.feedGrid}>
        {items.map((p) => {
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
              <div>
                <div>
                  <span className={pillClass(p)}>{itemPillLabel(p)}</span>
                  <span className={styles.feedMetaMuted}>
                    댓글 {p.comment_count} · 조회 {p.view_count}
                  </span>
                </div>
                <div className={styles.feedTitle}>{p.title}</div>
                <p className={styles.feedEx}>{preview}</p>
                <div className={styles.feedFoot}>{formatDate(p.created_at)}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {err ? (
        <p className={styles.errLine} role="alert">
          {err}
        </p>
      ) : null}

      <div className={styles.loadMore} ref={sentinelRef} role="status" aria-busy={loading}>
        {batches >= MAX_BATCHES ? '—' : loading ? '…' : '\u00a0'}
      </div>
    </section>
  );
}
