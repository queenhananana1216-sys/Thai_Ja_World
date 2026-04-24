import Link from 'next/link';
import {
  portAccentLink,
  portBodyText,
  portListRow,
  portMuted,
  portWidgetCard,
  portWidgetHeaderSub,
  portWidgetHeaderTitle,
} from '@/lib/landing/portalWidgetStyle';
import type { NewsTeaserItem } from '@/lib/landing/fetchNewsTeaser';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';

type Props = {
  locale: Locale;
  d: Dictionary;
  items: NewsTeaserItem[];
};

function relTime(iso: string | null, loc: Locale): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return loc === 'th' ? `${day} วัน` : `${day}일 전`;
  if (hr >= 1) return loc === 'th' ? `${hr} ชม.` : `${hr}시간 전`;
  if (min >= 1) return loc === 'th' ? `${min} นาที` : `${min}분 전`;
  return loc === 'th' ? 'เมื่อกี้' : '방금';
}

export function PortalNewsTeaser({ locale, d, items }: Props) {
  const h = d.home;
  const more =
    h.newsHubSectionMore?.trim() || (locale === 'th' ? 'ดูเพิ่ม →' : '전체 보기 →');
  return (
    <section className={portWidgetCard + ' p-4 sm:p-5'} aria-labelledby="tj-portal-news-teaser">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id="tj-portal-news-teaser" className={portWidgetHeaderTitle}>
          {h.newsTeaserTitle}
        </h2>
        <Link href="/news" className={portAccentLink} prefetch={false}>
          {more}
        </Link>
      </div>
      <p className={portWidgetHeaderSub}>{d.home.newsSub}</p>

      {items.length === 0 ? (
        <p
          className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500"
          role="status"
        >
          {d.home.newsEmpty}
        </p>
      ) : (
        <ol className="mt-2 list-none space-y-0.5 p-0">
          {items.map((it) => (
            <li key={it.id} className="m-0">
              <Link href={it.href} prefetch={false} className={portListRow}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-800 line-clamp-2">{it.title}</span>
                  {it.line ? <span className="mt-0.5 block text-slate-500 line-clamp-1">{it.line}</span> : null}
                </span>
                <time className={portMuted} dateTime={it.createdAt ?? undefined}>
                  {relTime(it.createdAt, locale)}
                </time>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className={`${portBodyText} mt-2 text-[11px] text-slate-500`}>
        {d.home.hotFootnote}
      </p>
    </section>
  );
}
