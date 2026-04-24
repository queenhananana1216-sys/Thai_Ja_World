import Link from 'next/link';
import { fetchRecentPosts } from '@/lib/landing/fetchRecentPosts';
import { categoryLabel } from '@/lib/community/postCategories';
import type { Locale } from '@/i18n/types';

/**
 * Philgo "최신 게시글" 라인에 대응 — 카테고리 무관 최신 12건을 한 리스트로.
 * 다크 톤, 모바일 1열 / 태블릿 2열 / 데스크톱 2열 + 밀도 압축.
 *
 * 비면 섹션 미노출. 한 행 전체가 Link.
 */

type Props = {
  locale: Locale;
  /** portal: 필고형 라이트 카드(랜딩 3열 중앙) / dark: 기존 다크 톤 */
  variant?: 'dark' | 'portal';
  /** portal에서만 사용 — 기본 12 */
  limit?: number;
};

function relTime(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return locale === 'th' ? `${day} วัน` : `${day}일 전`;
  if (hr >= 1) return locale === 'th' ? `${hr} ชม.` : `${hr}시간 전`;
  if (min >= 1) return locale === 'th' ? `${min} นาที` : `${min}분 전`;
  return locale === 'th' ? 'เมื่อสักครู่' : '방금 전';
}

function hrefForPost(p: { id: string; category: string; isKnowledgeTip: boolean }) {
  if (p.category === 'info' && p.isKnowledgeTip) return `/tips/${p.id}`;
  return `/community/boards/${p.id}`;
}

const CATEGORY_COLOR: Record<string, { color: string; bg: string }> = {
  free: { color: '#fbcfe8', bg: 'rgba(249,168,212,0.14)' },
  info: { color: '#bae6fd', bg: 'rgba(125,211,252,0.14)' },
  restaurant: { color: '#d9f99d', bg: 'rgba(190,242,100,0.14)' },
  flea: { color: '#fde68a', bg: 'rgba(251,191,36,0.14)' },
  job: { color: '#c4b5fd', bg: 'rgba(196,181,253,0.18)' },
};

/** 랜딩 포털(다크 서피스) — 밝은 파스텔 대신 semi-transparent */
const CATEGORY_COLOR_PORTAL: Record<string, { color: string; bg: string }> = {
  free: { color: '#fbcfe8', bg: 'rgba(244,114,182,0.12)' },
  info: { color: '#7dd3fc', bg: 'rgba(56,189,248,0.12)' },
  restaurant: { color: '#d9f99d', bg: 'rgba(163,230,53,0.12)' },
  flea: { color: '#fde68a', bg: 'rgba(251,191,36,0.12)' },
  job: { color: '#c4b5fd', bg: 'rgba(167,139,250,0.14)' },
};

export async function RecentPostsFeed({ locale, variant = 'dark', limit = 12 }: Props) {
  const items = await fetchRecentPosts(limit);
  if (items.length === 0) return null;

  const isPortal = variant === 'portal';
  const title = locale === 'th' ? 'โพสต์ล่าสุด' : '최신 게시글';
  const moreLabel = locale === 'th' ? 'ดูเพิ่ม →' : '전체 보기 →';
  const catMap = isPortal ? CATEGORY_COLOR_PORTAL : CATEGORY_COLOR;

  return (
    <section
      aria-labelledby="tj-recent-posts"
      style={isPortal ? { marginTop: 0, marginBottom: 0 } : { marginTop: 32, marginBottom: 8 }}
    >
      <div
        className="flex items-baseline justify-between gap-3"
        style={
          isPortal
            ? { marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }
            : { marginBottom: 12 }
        }
      >
        <h2
          id="tj-recent-posts"
          className={isPortal ? 'text-sm font-extrabold text-slate-100' : ''}
          style={
            isPortal
              ? { margin: 0, fontSize: 14, fontWeight: 800, color: '#f1f5f9' }
              : { margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }
          }
        >
          {title}
        </h2>
        <Link
          href="/community/boards"
          prefetch={false}
          className={isPortal ? 'text-xs font-semibold text-violet-300' : ''}
          style={
            isPortal
              ? { fontSize: 12, fontWeight: 700, color: '#c4b5fd', textDecoration: 'none' }
              : { fontSize: 12, fontWeight: 700, color: '#f9a8d4', textDecoration: 'none' }
          }
        >
          {moreLabel}
        </Link>
      </div>

      {!isPortal ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .tj-recent-grid {
              display: grid;
              gap: 4px;
              grid-template-columns: minmax(0, 1fr);
              background: rgba(15,17,40,0.7);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              padding: 6px;
            }
            @media (min-width: 768px) {
              .tj-recent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            .tj-recent-row { text-decoration: none; color: inherit; }
            .tj-recent-row:hover { background: rgba(255,255,255,0.06); }
            .tj-recent-row:focus-visible {
              outline: 2px solid #c4b5fd;
              outline-offset: 2px;
              background: rgba(255,255,255,0.06);
            }
          `,
          }}
        />
      ) : (
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .tj-recent-grid-portal {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .tj-recent-row-portal { text-decoration: none; color: inherit; border-radius: 6px; }
            .tj-recent-row-portal:hover { background: rgba(255,255,255,0.05); }
            .tj-recent-row-portal:focus-visible {
              outline: 2px solid #a78bfa;
              outline-offset: 1px;
              background: rgba(255,255,255,0.05);
            }
          `,
          }}
        />
      )}

      <div className={isPortal ? 'tj-recent-grid-portal' : 'tj-recent-grid'}>
        {items.map((p) => {
          const tone = catMap[p.category] ?? (isPortal
            ? { color: '#cbd5e1', bg: 'rgba(255,255,255,0.08)' }
            : { color: '#e2e8f0', bg: 'rgba(255,255,255,0.08)' });
          return (
            <Link
              key={p.id}
              href={hrefForPost(p)}
              prefetch={false}
              className={isPortal ? 'tj-recent-row-portal' : 'tj-recent-row'}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                padding: isPortal ? '6px 4px' : '10px 12px',
                borderRadius: isPortal ? 6 : 10,
                fontSize: 13.5,
                lineHeight: 1.4,
                minWidth: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: tone.color,
                  background: tone.bg,
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {p.isKnowledgeTip ? (locale === 'th' ? 'เคล็ดลับ' : '꿀팁') : categoryLabel(p.category, locale)}
              </span>
              <span
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isPortal ? '#f1f5f9' : '#f1f5f9',
                  fontWeight: 500,
                }}
              >
                {p.title}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  color: isPortal ? '#94a3b8' : '#94a3b8',
                  display: 'inline-flex',
                  gap: 8,
                  alignItems: 'baseline',
                }}
              >
                {p.commentCount > 0 ? (
                  <span
                    className={isPortal ? 'rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300' : ''}
                  >
                    {p.commentCount}
                  </span>
                ) : null}
                <time dateTime={p.createdAt ?? undefined}>{relTime(p.createdAt, locale)}</time>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
