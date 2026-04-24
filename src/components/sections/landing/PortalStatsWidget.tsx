import {
  portBodyText,
  portWidgetCard,
  portWidgetHeaderSub,
  portWidgetHeaderTitle,
} from '@/lib/landing/portalWidgetStyle';
import type { Locale } from '@/i18n/types';
import type { Dictionary } from '@/i18n/dictionaries';

type Props = {
  locale: Locale;
  d: Dictionary;
  memberCount: number;
  postCount: number;
  newsCount: number;
  spotCount: number;
  lastUpdatedAt: string | null;
  degraded: boolean;
};

function formatCount(n: number, loc: Locale): string {
  return n.toLocaleString(loc === 'th' ? 'th-TH' : 'ko-KR');
}

function relTimeShort(iso: string | null, loc: Locale): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return loc === 'th' ? `${day} วันที่แล้ว` : `${day}일 전`;
  if (hr >= 1) return loc === 'th' ? `${hr} ชม. ที่แล้ว` : `${hr}시간 전`;
  if (min >= 1) return loc === 'th' ? `${min} นาที ที่แล้ว` : `${min}분 전`;
  return loc === 'th' ? 'เมื่อกี้' : '방금';
}

/**
 * i18n은 서버(`getDictionary`)에서 합쳐진 문자열만 props로 전달.
 */
export function PortalStatsWidget({
  locale,
  d,
  memberCount,
  postCount,
  newsCount,
  spotCount,
  lastUpdatedAt,
  degraded,
}: Props) {
  const h = d.home;
  const cells: { label: string; value: string; hint?: string }[] = [
    { label: h.statsWidgetMember, value: formatCount(memberCount, locale) },
    { label: h.statsWidgetPost, value: formatCount(postCount, locale) },
    { label: h.statsWidgetNews, value: formatCount(newsCount, locale) },
    { label: h.statsWidgetLocal, value: formatCount(spotCount, locale) },
  ];

  return (
    <section
      className={portWidgetCard + ' p-4 sm:p-5'}
      aria-labelledby="tj-portal-stats-title"
    >
      <h2 id="tj-portal-stats-title" className={portWidgetHeaderTitle}>
        {h.statsWidgetTitle}
      </h2>
      <p className={portWidgetHeaderSub}>{h.statsWidgetSub}</p>
      {degraded ? (
        <p className="mt-2 text-[11px] font-medium text-amber-700" role="status">
          {locale === 'th' ? 'อ่านตัวเลขช้า — แสดงค่าล่าสุดที่มี' : '집계 지연 — 표시 가능한 범위만 보여요.'}
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-1">
        {cells.map((c) => (
          <div
            key={c.label}
            className="flex items-baseline justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
          >
            <dt className={`${portBodyText} m-0 font-medium text-slate-500`}>{c.label}</dt>
            <dd className="m-0 text-right text-sm font-extrabold tabular-nums text-slate-900">{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className={`${portBodyText} mt-3 border-t border-slate-100 pt-3`}>
        <span className="text-slate-500">{h.statsWidgetUpdated}:</span>{' '}
        <time dateTime={lastUpdatedAt ?? undefined}>{relTimeShort(lastUpdatedAt, locale)}</time>
      </p>
    </section>
  );
}
