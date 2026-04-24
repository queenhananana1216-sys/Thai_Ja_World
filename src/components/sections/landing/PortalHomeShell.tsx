import type { ReactNode } from 'react';
import { PORTAL_PAGE_BG } from '@/lib/landing/portalWidgetStyle';

const SHELL = 'mx-auto w-full max-w-7xl px-4 sm:px-6';

type Props = {
  children: ReactNode;
  /** max-w-7xl 안에서만 쓰는 랜딩 전용(히어로 등) */
  hero?: ReactNode;
  className?: string;
};

/**
 * 랜딩 포털: 페이지 배경은 밝고, 본문은 `max-w-7xl` + 동일 `px` 로만 쌓는다.
 * 다크/라이트 섹션을 세로로 쪼개지 않는다.
 */
export function PortalHomeShell({ children, hero, className }: Props) {
  return (
    <main
      className={`${PORTAL_PAGE_BG} min-h-screen text-slate-800 ${className ?? ''}`.trim()}
    >
      {hero ? <div className={`${SHELL} pb-6 pt-6 sm:pt-8`}>{hero}</div> : null}
      <div className={`${SHELL} pb-12`}>{children}</div>
    </main>
  );
}
