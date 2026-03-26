/** 한국 날짜(Asia/Seoul) 자정 구간 → UTC ISO (profiles.created_at 비교용) */
export function getKstDayRangeISO(now: Date = new Date()): {
  start: string;
  end: string;
  dateLabel: string;
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  const start = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    dateLabel: `${y}-${m}-${d}`,
  };
}

export function isTimestampInKstDay(iso: string, day: { start: string; end: string }): boolean {
  const t = new Date(iso).getTime();
  const a = new Date(day.start).getTime();
  const b = new Date(day.end).getTime();
  return Number.isFinite(t) && t >= a && t < b;
}
