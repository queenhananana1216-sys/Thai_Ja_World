'use client';

import Link from 'next/link';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';

const FOOTER_LINKS = {
  explore: [
    { href: '/', labelKo: '홈', labelTh: 'หน้าแรก' },
    { href: '/news', labelKo: '뉴스 스냅샷', labelTh: 'สรุปข่าว' },
    { href: '/tips', labelKo: '꿀팁', labelTh: 'เคล็ดลับ' },
    { href: '/local', labelKo: '로컬', labelTh: 'ท้องถิ่น' },
    { href: '/community/boards', labelKo: '광장', labelTh: 'ลานชุมชน' },
  ],
  social: [
    { href: '/minihome', labelKo: '미니홈', labelTh: 'มินิโฮม' },
    { href: '/ilchon', labelKo: '일촌', labelTh: 'อิลชน' },
    { href: '/community/trade', labelKo: '중고거래', labelTh: 'ซื้อขาย' },
  ],
  about: [
    { href: '/auth/login', labelKo: '로그인', labelTh: 'เข้าสู่ระบบ' },
    { href: '/auth/signup', labelKo: '회원가입', labelTh: 'สมัครสมาชิก' },
  ],
};

export function SiteFooter() {
  const { locale, d } = useClientLocaleDictionary();
  const label = (item: { labelKo: string; labelTh: string }) =>
    locale === 'th' ? item.labelTh : item.labelKo;
  const fn = d.footerNav;

  return (
    <footer className="mt-20 border-t border-violet-300/20 bg-[linear-gradient(180deg,#090a1a_0%,#060814_100%)] text-zinc-100">
      <div className="mx-auto max-w-[1320px] px-4 pb-2 pt-10">
        <div className="mb-8 rounded-3xl border border-violet-300/25 bg-white/5 p-5 shadow-[0_16px_45px_rgba(2,6,23,0.45)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">For Local Partners</p>
              <h3 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">
                로컬 가게 광고, 브랜드 신뢰를 높이는 방식으로 시작하세요
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                QR 유입 기반 미니홈, 메뉴/예약/공지 동선, 커뮤니티 신뢰 리뷰까지 한 번에 연결됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/ads"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 no-underline transition hover:opacity-90"
              >
                광고 상품 보기
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-violet-200/60 px-4 py-2.5 text-sm font-semibold text-violet-100 no-underline transition hover:bg-white/10"
              >
                광고 문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <span className="text-lg font-extrabold tracking-tight text-white">
            <span className="text-[#c4b5fd]">태</span>
            <span className="text-zinc-50">국에 살</span>
            <span className="text-[#f9a8d4]">자</span>
            <span className="ml-1 text-sm font-semibold text-amber-300">월드</span>
          </span>
          <p className="text-sm leading-relaxed text-zinc-300">
            {locale === 'th'
              ? 'แพลตฟอร์มชุมชนสำหรับคนอาศัยในประเทศไทย'
              : '태국 살이 정보 나눔 커뮤니티 플랫폼'}
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-200">
            {locale === 'th' ? 'สำรวจ' : '둘러보기'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.explore.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-zinc-100 no-underline underline-offset-2 transition-colors hover:text-white hover:underline"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-200">
            {locale === 'th' ? 'โซเชียล' : '소셜'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.social.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-zinc-100 no-underline underline-offset-2 transition-colors hover:text-white hover:underline"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-200">
            {locale === 'th' ? 'บัญชี' : '계정'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.about.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-zinc-100 no-underline underline-offset-2 transition-colors hover:text-white hover:underline"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-zinc-200"
            aria-label={locale === 'th' ? 'นโยบายและข้อมูล' : '약관·안내'}
          >
            <Link href="/terms" className="no-underline hover:text-white hover:underline">
              {fn.terms}
            </Link>
            <Link href="/privacy" className="no-underline hover:text-white hover:underline">
              {fn.privacy}
            </Link>
            <Link href="/contact" className="no-underline hover:text-white hover:underline">
              {fn.contact}
            </Link>
            <Link href="/ads" className="no-underline hover:text-white hover:underline">
              {fn.ads}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-xs text-zinc-300">
              &copy; {new Date().getFullYear()} 태자월드. All rights reserved.
            </p>
            <a
              href="https://www.thaijaworld.com"
              className="text-xs text-zinc-200 no-underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              thaijaworld.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
