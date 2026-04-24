import Link from 'next/link';
import { portAccentLink, portListRow, portPill, portWidgetCard, portWidgetHeaderSub, portWidgetHeaderTitle } from '@/lib/landing/portalWidgetStyle';
import { fetchRecentPosts } from '@/lib/landing/fetchRecentPosts';
import { categoryLabel } from '@/lib/community/postCategories';
import type { Locale } from '@/i18n/types';
import { getDictionary } from '@/i18n/dictionaries';

/**
 * Philgo "최신 게시글" 라인에 대응 — 카테고리 무관 최신 12건을 한 리스트로.
 * 다크 톤, 모바일 1열 / 태블릿 2열 / 데스크톱 2열 + 밀도 압축.
 *
 * 비면 섹션 미노출. 한 행 전체가 Link.
 */

type Props = {
  locale: Locale;
  variant?: 'dark' | 'light';
  /** `light`일 때: 서버에서 getDictionary로 합친 객체 */
  dictionary?: ReturnType<typeof getDictionary>;
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

const CATEGORY_COLOR_LIGHT: Record<string, { color: string; bg: string }> = {
  free: { color: '#9d174d', bg: 'rgba(251,113,133,0.12)' },
  info: { color: '#075985', bg: 'rgba(14,165,233,0.1)' },
  restaurant: { color: '#3f6212', bg: 'rgba(163,230,53,0.14)' },
  flea: { color: '#92400e', bg: 'rgba(245,158,11,0.12)' },
  job: { color: '#5b21b6', bg: 'rgba(167,139,250,0.12)' },
};

export async function RecentPostsFeed({ locale, variant = 'dark', dictionary }: Props) {
  const items = await fetchRecentPosts(12);
  if (items.length === 0) return null;

  const d = dictionary ?? getDictionary(locale);
  const title = d.home.recentPostsTitle?.trim() || (locale === 'th' ? 'โพสต์ล่าสุด' : '최신 게시글');
  const subLine = d.home.recentPostsSub?.trim() || d.home.hubBoardSub;
  const moreLabel =
    d.home.newsHubSectionMore?.trim() || (locale === 'th' ? 'ดูเพิ่ม →' : '전체 보기 →');
  const isLight = variant === 'light';

  if (isLight) {
    return (
      <section
        aria-labelledby="tj-recent-posts"
        className="tj-recent-wrap tj-recent-wrap--light"
        style={{ marginTop: 0, marginBottom: 8 }}
      >
        <div className={portWidgetCard + ' p-4'}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 id="tj-recent-posts" className={portWidgetHeaderTitle + ' m-0'}>
              {title}
            </h2>
            <Link href="/community/boards" prefetch={false} className={portAccentLink}>
              {moreLabel}
            </Link>
          </div>
          <p className={portWidgetHeaderSub + ' mb-2.5'}>{subLine}</p>
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .tj-recent-wrap--light .tj-recent-grid {
              display: grid;
              gap: 2px;
              grid-template-columns: minmax(0, 1fr);
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 4px;
            }
            .tj-recent-wrap--light .tj-recent-row--light { text-decoration: none; color: inherit; }
            .tj-recent-wrap--light .tj-recent-row--light:hover { background: #f1f5f9; }
            .tj-recent-wrap--light .tj-recent-row--light:focus-visible {
              outline: 2px solid #7c3aed;
              outline-offset: 2px;
              background: #f1f5f9;
            }
          `,
            }}
          />
          <div className="tj-recent-grid">
            {items.map((p) => {
              const tone =
                CATEGORY_COLOR_LIGHT[p.category] ?? { color: '#0f172a', bg: '#e2e8f0' };
              return (
                <Link
                  key={p.id}
                  href={hrefForPost(p)}
                  prefetch={false}
                  className={portListRow + ' tj-recent-row--light min-w-0 font-medium'}
                >
                  <span
                    aria-hidden
                    className={portPill}
                    style={{ color: tone.color, background: tone.bg, fontSize: 10, letterSpacing: '0.04em' }}
                  >
                    {p.isKnowledgeTip ? (locale === 'th' ? 'เคล็ดลับ' : '꿀팁') : categoryLabel(p.category, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-800">{p.title}</span>
                  <span className="ml-auto flex shrink-0 items-baseline gap-1.5 text-slate-400 [font-size:11px] tabular-nums">
                    {p.commentCount > 0 ? (
                      <span>{locale === 'th' ? '💬' : '댓'} {p.commentCount}</span>
                    ) : null}
                    <time dateTime={p.createdAt ?? undefined}>{relTime(p.createdAt, locale)}</time>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="tj-recent-posts"
      style={{
        marginTop: 32,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2
          id="tj-recent-posts"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          {title}
        </h2>
        <Link
          href="/community/boards"
          prefetch={false}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#f9a8d4',
            textDecoration: 'none',
          }}
        >
          {moreLabel}
        </Link>
      </div>

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

      <div className="tj-recent-grid">
        {items.map((p) => {
          const tone = CATEGORY_COLOR[p.category] ?? { color: '#e2e8f0', bg: 'rgba(255,255,255,0.08)' };
          return (
            <Link
              key={p.id}
              href={hrefForPost(p)}
              prefetch={false}
              className="tj-recent-row"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
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
                  color: '#f1f5f9',
                  fontWeight: 500,
                }}
              >
                {p.title}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  color: '#94a3b8',
                  display: 'inline-flex',
                  gap: 8,
                  alignItems: 'baseline',
                }}
              >
                {p.commentCount > 0 ? (
                  <span>{locale === 'th' ? '💬' : '댓'} {p.commentCount}</span>
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
