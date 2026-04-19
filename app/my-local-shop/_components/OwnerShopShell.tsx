'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { OWNER_SHOP_NAV } from './ownerShopNav';

export type OwnerShopSummary = {
  id: string;
  name: string;
  minihome_public_slug: string | null;
};

export default function OwnerShopShell({
  spot,
  children,
}: {
  spot: OwnerShopSummary;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = `/my-local-shop/${spot.id}`;

  return (
    <div className="owner-shop-shell">
      <header className="owner-shop-shell__header">
        <p className="owner-shop-shell__back-wrap">
          <Link href="/my-local-shop" className="owner-shop-shell__back">
            ← 내 가게 목록
          </Link>
        </p>
        <h1 className="owner-shop-shell__title">{spot.name}</h1>
        <p className="owner-shop-shell__meta">
          내 가게 관리
          {spot.minihome_public_slug ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/shop/${spot.minihome_public_slug}`} className="owner-shop-shell__public-link">
                공개 미니홈 보기
              </Link>
            </>
          ) : (
            ' · 공개 미니홈 주소는 운영진이 연결합니다'
          )}
        </p>
      </header>

      <nav aria-label="가게 관리 메뉴" className="owner-shop-shell__nav">
        {OWNER_SHOP_NAV.map(({ segment, label }) => {
          const href = segment ? `${base}/${segment}` : base;
          const active =
            segment === ''
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={segment || 'overview'}
              href={href}
              className={
                'owner-shop-shell__nav-link' +
                (active ? ' owner-shop-shell__nav-link--active' : '')
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="owner-shop-shell__main">{children}</main>
    </div>
  );
}
