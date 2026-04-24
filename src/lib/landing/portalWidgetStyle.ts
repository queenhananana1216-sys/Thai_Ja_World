/**
 * 랜딩 포털(밝은 배경 + 흰 카드) UI에서 위젯 테두리·배경을 한 곳에서 맞춘다.
 * Tailwind class 문자열 (PortalHomeShell / WidgetGrid / 위젯들이 공용).
 */
export const PORTAL_PAGE_BG = 'bg-slate-100/90';

export const portWidgetCard = [
  'rounded-2xl border border-slate-200/80 bg-white shadow-sm',
  'shadow-slate-200/40',
].join(' ');

export const portWidgetHeaderTitle = 'text-sm font-extrabold text-slate-800 tracking-tight';
export const portWidgetHeaderSub = 'mt-0.5 text-xs leading-relaxed text-slate-500';
export const portWidgetKicker = 'text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600';

export const portBodyText = 'text-xs leading-snug text-slate-600';
export const portListRow = [
  'flex min-w-0 items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-xs',
  'text-slate-800 no-underline transition',
  'hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400/80',
].join(' ');

export const portMuted = 'text-slate-400 text-[11px] tabular-nums';
export const portPill = 'shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600';
export const portAccentLink = 'text-xs font-semibold text-violet-700 no-underline hover:underline';
export const portPrimaryBtn =
  'inline-flex min-h-9 items-center justify-center rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white no-underline shadow-sm hover:bg-violet-700';
export const portSecondaryBtn =
  'inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50';
