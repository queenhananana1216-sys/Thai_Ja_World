import GuestGateLink from '@app/_components/GuestGateLink';
import { ReportQuickMenuTile } from '@app/_components/ReportModal';
import { ThbKrwQuickMenuTile } from '@app/_components/ThbKrwBottomSheet';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

const ICON_BY_KEY: Record<string, string> = {
  job: '💼',
  flea: '🛒',
  free: '💬',
  local: '🏬',
  news: '📰',
  visaTips: '💡',
  report: '🚨',
  fxRate: '💱',
};

function quickMenuLabel(locale: Locale, key: string, fallbackTitle: string): string {
  if (locale === 'th') {
    const th: Record<string, string> = {
      job: 'งาน',
      flea: 'มือสอง',
      free: 'บอร์ด',
      local: 'ท้องถิ่น',
      news: 'ข่าว',
      visaTips: 'ทิปส์',
      report: 'แจ้งเบาะแส',
      fxRate: 'เรทบาท',
    };
    return th[key] ?? fallbackTitle;
  }
  const ko: Record<string, string> = {
    job: '구인',
    flea: '장터',
    free: '자유',
    local: '로컬',
    news: '뉴스',
    visaTips: '꿀팁',
    report: '제보함',
    fxRate: '바트 환율',
  };
  return ko[key] ?? fallbackTitle;
}

/** 포털 홈 중앙 상단 — 제보함을 맨 앞에 두고 PC·모바일 동일 그리드 */
function orderedQuickColumns(copy: ReturnType<typeof getPortal2026Copy>) {
  const cols = copy.boardColumns;
  const report = cols.find((c) => c.key === 'report');
  const rest = cols.filter((c) => c.key !== 'report');
  return report ? [report, ...rest] : rest;
}

type PortalQuickMenuProps = {
  locale: Locale;
  isLoggedIn: boolean;
};

export default function PortalQuickMenu({ locale, isLoggedIn }: PortalQuickMenuProps) {
  const copy = getPortal2026Copy(locale);
  const aria =
    locale === 'th' ? 'เมนูด่วนโพร์ทัล' : locale === 'ko' ? '포털 퀵 메뉴' : 'Portal quick menu';

  const reportIconClasses =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-rose-400/55 bg-gradient-to-br from-rose-950/75 via-slate-800/95 to-slate-900/90 text-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(251,113,133,0.15),0_10px_28px_rgba(225,29,72,0.22)]';

  return (
    <nav aria-label={aria} className="mb-3">
      <div className={`${styles.glassBlue} px-3 py-3 md:py-3.5`}>
        <ul className="grid grid-cols-4 gap-3 md:grid-cols-5">
          {orderedQuickColumns(copy).map((board) => {
            if (board.key === 'fxRate') {
              const label = quickMenuLabel(locale, board.key, board.title);
              return <ThbKrwQuickMenuTile key={board.key} locale={locale} label={label} />;
            }
            if (board.key === 'report') {
              const label = quickMenuLabel(locale, board.key, board.title);
              return (
                <ReportQuickMenuTile
                  key={board.key}
                  locale={locale}
                  label={label}
                  iconClassName={reportIconClasses}
                />
              );
            }
            const href = board.moreHref?.trim() ? board.moreHref : '/boards';
            const icon = ICON_BY_KEY[board.key] ?? '📌';
            const label = quickMenuLabel(locale, board.key, board.title);
            return (
              <li key={board.key} className="min-w-0">
                <GuestGateLink
                  href={href}
                  isLoggedIn={isLoggedIn}
                  className="flex touch-manipulation flex-col items-center gap-2 rounded-xl px-1 py-1 text-gray-100 active:opacity-90"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/90 text-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-snug">
                    {label}
                  </span>
                </GuestGateLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
