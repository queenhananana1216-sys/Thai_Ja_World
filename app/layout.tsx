import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Noto_Sans_KR, Noto_Sans_Thai } from 'next/font/google';
import { getSiteBaseUrl } from '@/lib/seo/site';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-kr',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-th',
  display: 'swap',
});

/** 레이아웃 파일 외부 React 컴포넌트 0개 — 메타만 정적 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: '태자월드',
    template: '%s | 태자월드',
  },
  description: '태국 교민 커뮤니티 태자월드',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: '48x48' }],
  },
  verification: {
    other: {
      'naver-site-verification': 'a5e68e7ff5120e3afa1c6c2c5c49d59e193760bb',
    },
  },
};

/**
 * 비상 루트: GlobalNav / SiteFooter 등 어떤 import 컴포넌트도 없음.
 * <body> 안은 순수 HTML + Tailwind 클래스만.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';

  return (
    <html lang="ko" className={`${notoSansKr.variable} ${notoSansThai.variable} overflow-x-hidden`}>
      <body
        className="flex min-h-screen flex-col overflow-x-hidden bg-[#0B0F19] text-slate-200"
        data-tj-deploy-sha={deploySha || undefined}
        data-tj-layout="inline-static-chrome"
      >
        <header className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
          <div className="border-b border-white/5 bg-slate-950/80">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-4 py-1.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <span className="rounded border border-white/10 px-1.5 py-0.5 text-slate-400">한국어</span>
                <span className="text-slate-600">/</span>
                <span className="rounded border border-white/10 px-1.5 py-0.5 text-slate-400">ไทย</span>
              </div>
              <div className="inline-flex flex-wrap items-center justify-end gap-1 rounded-full border border-amber-200/25 bg-gradient-to-r from-white/10 to-indigo-950/40 px-2 py-1">
                <Link
                  href="/auth/login?next=%2F"
                  className="rounded-full bg-violet-600/90 px-2.5 py-1 text-[10px] font-extrabold text-white no-underline"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup?next=%2F"
                  className="rounded-full border border-white/25 px-2.5 py-1 text-[10px] font-extrabold text-slate-100 no-underline"
                >
                  회원가입
                </Link>
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" className="inline-flex items-center gap-2 no-underline" aria-label="태자월드 홈">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/40 to-slate-900 text-lg font-black text-white md:h-11 md:w-11"
                aria-hidden
              >
                태
              </span>
              <span className="text-base font-black tracking-tight text-white md:text-lg">
                태자<span className="text-amber-300">월드</span>
              </span>
            </Link>

            <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
              <label className="sr-only" htmlFor="tj-inline-search">
                통합 검색
              </label>
              <input
                id="tj-inline-search"
                type="search"
                name="tj-inline-search"
                readOnly
                tabIndex={-1}
                placeholder="게시글·뉴스·로컬 검색 (UI만)"
                className="w-full rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
              />
              <p className="mt-1 text-center text-[10px] text-slate-600 md:text-left">검색 기능은 추후 연결</p>
            </div>
          </div>

          <nav
            className="border-t border-white/5 bg-gradient-to-b from-slate-950/90 to-slate-900/95 py-2"
            aria-label="주요 메뉴"
          >
            <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4">
              <details className="group md:hidden">
                <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden">
                  메뉴 <span className="text-slate-500">▾</span>
                </summary>
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-2">
                  <Link
                    href="/auth/login?next=%2F"
                    className="rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-sm font-semibold text-violet-100 no-underline"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup?next=%2F"
                    className="rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-sm font-semibold text-pink-100 no-underline"
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/community/write"
                    className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white no-underline"
                  >
                    ✎ 글쓰기
                  </Link>
                  <Link href="/" className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800">
                    홈
                  </Link>
                  <Link
                    href="/community/boards"
                    className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800"
                  >
                    자유게시판
                  </Link>
                  <Link
                    href="/community/boards?cat=flea"
                    className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800"
                  >
                    번개장터
                  </Link>
                  <Link
                    href="/community/boards?cat=job"
                    className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800"
                  >
                    구인구직
                  </Link>
                  <Link href="/news" className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800">
                    뉴스
                  </Link>
                  <Link href="/local" className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800">
                    로컬
                  </Link>
                </div>
              </details>

              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <Link
                  href="/"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  홈
                </Link>
                <Link
                  href="/community/boards"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  자유게시판
                </Link>
                <Link
                  href="/community/boards?cat=flea"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  번개장터
                </Link>
                <Link
                  href="/community/boards?cat=job"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  구인구직
                </Link>
                <Link
                  href="/local/info"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  부동산
                </Link>
                <Link
                  href="/local"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  로컬예약
                </Link>
                <Link
                  href="/news"
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
                >
                  뉴스
                </Link>
                <Link
                  href="/community/write"
                  className="ml-auto rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white no-underline hover:bg-blue-500"
                >
                  ✎ 글쓰기
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <div className="min-h-0 w-full flex-1 overflow-x-hidden">{children}</div>

        <footer className="mt-auto border-t border-white/10 bg-[#060814] px-4 py-6 text-center text-[11px] text-slate-500">
          <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="약관·안내">
            <Link href="/terms" className="text-slate-400 no-underline hover:text-white hover:underline">
              이용약관
            </Link>
            <Link href="/privacy" className="text-slate-400 no-underline hover:text-white hover:underline">
              개인정보
            </Link>
            <Link href="/contact" className="text-slate-400 no-underline hover:text-white hover:underline">
              문의
            </Link>
          </nav>
          <p className="m-0">&copy; {new Date().getFullYear()} 태자월드</p>
        </footer>
      </body>
    </html>
  );
}
