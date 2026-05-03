'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/publish', label: '관제', icon: '◉' },
  { href: '/admin/design', label: '디자인', icon: '◇' },
  { href: '/admin/users', label: '소통', icon: '◍' },
  { href: '/admin/sandbox', label: 'AI', icon: '🧬' },
] as const;

export default function AdminMobileTabBar() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="admin-mtab" aria-label="모바일 관리자 빠른 메뉴">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            prefetch={true}
            key={t.href}
            href={t.href}
            className={`admin-mtab__btn ${active ? 'admin-mtab__btn--active' : ''}`}
          >
            <span className="admin-mtab__ico" aria-hidden>
              {t.icon}
            </span>
            <span className="admin-mtab__lbl">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
