/**
 * app/admin/layout.tsx — 관리자 영역 레이아웃
 *
 * 오너/관리자 권한이 아니면 즉시 홈으로 리다이렉트합니다.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import AdminMobileTabBar from './_components/AdminMobileTabBar';
import { AdminSidebarNav } from './_components/AdminSidebarNav';
import { adminNavSections } from './adminNavConfig';
import './admin-shell.css';

export const metadata = {
  title: '태국에, 살자 (Living in Thai) — 관리자',
  description: '「태국에, 살자」운영 콘솔 — 승인 큐·로컬·디자인',
};

// 관리자 트리 전체는 동적 렌더 — Supabase service role 클라이언트가 빌드 시점에
// throw 하면 정적 프리렌더 실패로 배포가 깨진다. 이 플래그는 하위 page.tsx 모두에 전파.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await resolveAdminAccess())) {
    redirect('/');
  }

  return (
    <div className="admin-shell admin-shell--dashboard">
      <aside className="admin-shell__sidebar" aria-label="관리자 사이드바">
        <Link prefetch={true} href="/admin" className="admin-shell__brand">
          <span className="admin-shell__brand-mark">살</span>
          <span>
            <strong>태국에, 살자</strong>
            <small>Living in Thai · 운영</small>
          </span>
        </Link>
        <AdminSidebarNav sections={adminNavSections} />
        <p className="admin-shell__sidebar-hint">인가된 운영자만 접근 가능합니다.</p>
      </aside>
      <div className="admin-shell__viewport">
        <div className="admin-shell__viewport-inner">{children}</div>
      </div>
      <AdminMobileTabBar />
    </div>
  );
}
