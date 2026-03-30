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
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '20px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <header>
        <p style={{ margin: '0 0 8px' }}>
          <Link href="/my-local-shop" style={{ fontSize: 13, color: 'var(--tj-link, #7c3aed)' }}>
            ← 내 가게 목록
          </Link>
        </p>
        <h1 style={{ fontSize: '1.35rem', margin: '0 0 6px' }}>{spot.name}</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tj-muted, #64748b)' }}>
          내 가게 관리
          {spot.minihome_public_slug ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/shop/${spot.minihome_public_slug}`} style={{ color: 'var(--tj-link, #7c3aed)' }}>
                공개 미니홈 보기
              </Link>
            </>
          ) : (
            ' · 공개 미니홈 주소는 운영진이 연결합니다'
          )}
        </p>
      </header>

      <nav
        aria-label="가게 관리 메뉴"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '10px 0',
          borderTop: '1px solid var(--tj-border, #e2e8f0)',
          borderBottom: '1px solid var(--tj-border, #e2e8f0)',
        }}
      >
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
              style={{
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                padding: '6px 12px',
                borderRadius: 999,
                textDecoration: 'none',
                background: active ? 'rgba(124, 58, 237, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                color: active ? 'var(--tj-link, #6d28d9)' : 'var(--tj-ink, #334155)',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <main>{children}</main>
    </div>
  );
}
