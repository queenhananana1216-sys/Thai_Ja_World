'use client';

import Link from 'next/link';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';

const FOOTER_LINKS = {
  explore: [
    { href: '/', labelKo: '홈', labelTh: 'หน้าแรก' },
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
  const { locale } = useClientLocaleDictionary();
  const label = (item: { labelKo: string; labelTh: string }) =>
    locale === 'th' ? item.labelTh : item.labelKo;

  return (
    <footer className="mt-16 border-t-2 border-tj-line bg-tj-header text-gray-300">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <span className="text-lg font-extrabold tracking-tight text-white">
            <span className="text-brand-tai">태</span>
            <span>국에 살</span>
            <span className="text-brand-ja">자</span>
            <span className="ml-1 text-sm font-semibold text-museum-saffron">월드</span>
          </span>
          <p className="text-xs leading-relaxed text-gray-400">
            {locale === 'th'
              ? 'แพลตฟอร์มชุมชนสำหรับคนอาศัยในประเทศไทย'
              : '태국 살이 정보 나눔 커뮤니티 플랫폼'}
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-museum-saffron">
            {locale === 'th' ? 'สำรวจ' : '둘러보기'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.explore.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-gray-400 no-underline transition-colors hover:text-white hover:no-underline"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-museum-saffron">
            {locale === 'th' ? 'โซเชียล' : '소셜'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.social.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-gray-400 no-underline transition-colors hover:text-white hover:no-underline"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-museum-saffron">
            {locale === 'th' ? 'บัญชี' : '계정'}
          </h4>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.about.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-gray-400 no-underline transition-colors hover:text-white hover:no-underline"
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
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} 태자월드. All rights reserved.
          </p>
          <a
            href="https://www.thaijaworld.com"
            className="text-xs text-gray-500 no-underline hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            thaijaworld.com
          </a>
        </div>
      </div>
    </footer>
  );
}
