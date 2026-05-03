'use client';

import Link from 'next/link';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { useSiteDisplayName } from '@/contexts/SiteBrandContext';

const FOOTER_LINKS = {
  explore: [
    { href: '/', labelKo: '홈', labelTh: 'หน้าแรก' },
    { href: '/news', labelKo: '뉴스 스냅샷', labelTh: 'สรุปข่าว' },
    { href: '/tips', labelKo: '꿀팁', labelTh: 'เคล็ดลับ' },
    { href: '/local', labelKo: '로컬', labelTh: 'ท้องถิ่น' },
    { href: '/community/boards', labelKo: '커뮤니티', labelTh: 'ชุมชน' },
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
  const siteName = useSiteDisplayName();
  const label = (item: { labelKo: string; labelTh: string }) =>
    locale === 'th' ? item.labelTh : item.labelKo;
  const fn = d.footerNav;

  return (
    <footer className="mt-20 border-t border-violet-300/20 bg-[linear-gradient(180deg,#090a1a_0%,#060814_100%)] text-zinc-100">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            <span className="text-3xl leading-none" aria-hidden>
              🐘
            </span>
            <span
              className="bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-200 bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--tj-brand-nunito), system-ui, sans-serif' }}
            >
              {siteName}
            </span>
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
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
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
