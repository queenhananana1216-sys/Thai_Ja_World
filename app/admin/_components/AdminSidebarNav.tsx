'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminNavSection } from '../adminNavConfig';

export function AdminSidebarNav({ sections }: { sections: AdminNavSection[] }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      {sections.map((section) => (
        <section key={section.title} className="admin-shell__menu">
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    prefetch={true}
                    href={item.href}
                    className={`admin-shell__menu-link${active ? ' admin-shell__menu-link--active' : ''}`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
