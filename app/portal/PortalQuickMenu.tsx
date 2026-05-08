import GuestGateLink from '@app/_components/GuestGateLink';
import ThaiQuickWalletStrip from '@app/_components/ThaiQuickWalletStrip';
import { ReportQuickMenuTile } from '@app/_components/ReportModal';
import { ThbKrwQuickMenuTile } from '@app/_components/ThbKrwBottomSheet';
import { SponsorQuickMenuTile } from '@/components/banners/SponsorQuickMenuTile';
import type { PublicBanner } from '@/lib/banners/types';
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
  /** 로그인 시 헤더와 동일 계열 — 보유 타이 THAI(SSR 스냅샷) */
  thaiBalance?: number | null;
  /** 쿠키 기반 타겟 정렬 후 1번·7번 퀵 칸 매출 타일 (`premium_banners` placement) */
  portalQuickBanners?: { tile1: PublicBanner | null; tile7: PublicBanner | null };
};

export default function PortalQuickMenu({
  locale,
  isLoggedIn,
  thaiBalance = null,
  portalQuickBanners,
}: PortalQuickMenuProps) {
  const copy = getPortal2026Copy(locale);
  const aria =
    locale === 'th' ? 'เมนูด่วนโพร์ทัล' : locale === 'ko' ? '포털 퀵 메뉴' : 'Portal quick menu';

  const reportIconClasses =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[0.5px] border-cyan-400/40 bg-gradient-to-br from-indigo-950/85 via-slate-900/95 to-cyan-950/70 text-[1.2rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(34,211,238,0.12),0_10px_28px_rgba(99,102,241,0.22)] backdrop-blur-xl md:h-14 md:w-14 md:text-[1.35rem]';

  return (
    <nav aria-label={aria} className="mb-2 md:mb-2.5">
      <div className={`${styles.glassBlue} px-2.5 py-2 md:px-3 md:py-2.5`}>
        {isLoggedIn ? (
          <ThaiQuickWalletStrip locale={locale} initialBalance={thaiBalance ?? null} />
        ) : null}
        <ul className="grid grid-cols-4 gap-2 md:grid-cols-5 md:gap-2.5">
          {orderedQuickColumns(copy).map((board, idx) => {
            const gridPos = idx + 1;
            if (gridPos === 1 && portalQuickBanners?.tile1) {
              return (
                <li key={`tj-pq-slot-1-${portalQuickBanners.tile1.id}`} className="min-w-0">
                  <SponsorQuickMenuTile
                    banner={portalQuickBanners.tile1}
                    placement="portal_quick_1"
                    locale={locale}
                    isLoggedIn={isLoggedIn}
                  />
                </li>
              );
            }
            if (gridPos === 7 && portalQuickBanners?.tile7) {
              return (
                <li key={`tj-pq-slot-7-${portalQuickBanners.tile7.id}`} className="min-w-0">
                  <SponsorQuickMenuTile
                    banner={portalQuickBanners.tile7}
                    placement="portal_quick_7"
                    locale={locale}
                    isLoggedIn={isLoggedIn}
                  />
                </li>
              );
            }
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
                  className="flex touch-manipulation flex-col items-center gap-1.5 rounded-xl px-0.5 py-0.5 text-gray-100 active:opacity-90 md:gap-2 md:px-1 md:py-1"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/90 text-[1.2rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:h-14 md:w-14 md:text-[1.35rem]"
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight max-[768px]:text-[0.68rem] md:text-sm md:leading-snug">
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
