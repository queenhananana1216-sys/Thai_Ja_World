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

type PortalMobileQuickMenuProps = {
  locale: Locale;
  isLoggedIn: boolean;
};

/** 모바일 홈 상단 — 원형 아이콘 + 짧은 라벨 퀵 메뉴 (PC에서는 숨김) */
export default function PortalMobileQuickMenu({ locale, isLoggedIn }: PortalMobileQuickMenuProps) {
  const copy = getPortal2026Copy(locale);
  const aria =
    locale === 'th' ? 'เมนูด่วนโพร์ทัล' : locale === 'ko' ? '포털 퀵 메뉴' : 'Portal quick menu';

  return (
    <nav aria-label={aria} className="mb-3 block md:hidden">
      <div className={`${styles.glassBlue} px-3 py-4`}>
        <ul className="grid grid-cols-4 gap-4">
          {copy.boardColumns.map((board) => {
            if (board.key === 'fxRate') {
              const label = quickMenuLabel(locale, board.key, board.title);
              return <ThbKrwQuickMenuTile key={board.key} locale={locale} label={label} />;
            }
            if (board.key === 'report') {
              const label = quickMenuLabel(locale, board.key, board.title);
              return <ReportQuickMenuTile key={board.key} locale={locale} label={label} />;
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
