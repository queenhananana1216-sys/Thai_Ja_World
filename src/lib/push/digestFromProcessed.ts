import { newsDetailFromProcessed } from '@/lib/news/processedNewsDisplay';
import type { BangkokWeatherPair } from '@/lib/weather/bangkokWeatherSnippet';

export type ProcessedNewsDigestRow = {
  id: string;
  clean_body: string | null;
  raw_news: { title: string | null } | null;
  summaries: { summary_text: string; model: string | null }[] | null;
};

function oneLine(
  blurb: string | null,
  summary: string | null,
  title: string,
  maxLen: number,
): string {
  const raw = (blurb?.trim() || summary?.trim() || title.trim() || '').replace(/\s+/g, ' ');
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/** 최신 1건 + (선택) 방콕 날씨 — 다이제스트형 알림 본문 */
export function buildDailyWebPushPayload(
  row: ProcessedNewsDigestRow,
  origin: string,
  weather?: BangkokWeatherPair | null,
): { title: string; body: string; url: string; tag: string } | null {
  const rawTitle = row.raw_news?.title ?? null;
  const ko = newsDetailFromProcessed(
    row.clean_body,
    rawTitle,
    null,
    row.summaries ?? null,
    'ko',
  );
  const th = newsDetailFromProcessed(
    row.clean_body,
    rawTitle,
    null,
    row.summaries ?? null,
    'th',
  );

  const koLine = oneLine(ko.blurb, ko.summary, ko.title, 140);
  const thLine = oneLine(th.blurb, th.summary, th.title, 140);
  if (!koLine && !thLine) return null;

  const base = origin.replace(/\/$/, '');
  const lines: string[] = [];
  if (weather) {
    lines.push(`🌤 ${weather.ko} · ${weather.th}`);
  }
  lines.push(`🇰🇷 ${koLine || '—'}`, `🇹🇭 ${thLine || '—'}`);

  return {
    title: '태자 월드 · 오늘 살이 참고 한 줄',
    body: lines.join('\n'),
    url: `${base}/news/${row.id}`,
    tag: `daily-news-${row.id}`,
  };
}
