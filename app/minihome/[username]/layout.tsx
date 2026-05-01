import type { ReactNode } from 'react';

/**
 * 공개 슬러그 기반 미니홈 — 전역 내비 아래 전체 폭 글라스 셸.
 * (경로 세그먼트 이름은 username 이지만 값은 user_minihomes.public_slug 입니다.)
 */
export default function MinihomeUsernameLayout({ children }: { children: ReactNode }) {
  return (
    <div className="minihome-user-shell relative min-h-[calc(100vh-6rem)] w-full overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_20%,rgba(56,189,248,0.14),transparent_50%),linear-gradient(180deg,#070b14_0%,#0b0f19_45%,#070b14_100%)]"
      />
      <div className="relative z-0 mx-auto w-full max-w-6xl px-3 py-6 sm:px-5">{children}</div>
    </div>
  );
}
