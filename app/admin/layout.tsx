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
import './admin-shell.css';

export const metadata = {
  title: '태자 월드 — 관리자',
};

// 관리자 트리 전체는 동적 렌더 — Supabase service role 클라이언트가 빌드 시점에
// throw 하면 정적 프리렌더 실패로 배포가 깨진다. 이 플래그는 하위 page.tsx 모두에 전파.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const adminSections = [
  {
    title: '파이프라인 관제',
    items: [
      { href: '/admin', label: '개요', icon: '◈' },
      { href: '/admin/ops-center', label: '운영 통합센터', icon: '◉' },
      { href: '/admin/bot-actions', label: '봇 실행 기록', icon: '◎' },
      { href: '/admin/publish', label: '최종 승인 허브', icon: '✦' },
    ],
  },
  {
    title: '사이트 · 노출',
    items: [
      { href: '/admin/design', label: '사이트 디자인 제어', icon: '◇' },
      { href: '/admin/banners', label: '배너 Control Center', icon: '▣' },
      { href: '/admin/premium-banners', label: '프리미엄 배너', icon: '▦' },
      { href: '/admin/home-hero', label: '홈 메인 문구', icon: '✶' },
    ],
  },
  {
    title: '유저 · 퀘스트 관리',
    items: [
      { href: '/admin/users', label: '이용자 디렉터리', icon: '◍' },
      { href: '/admin/community-posts', label: '광장 글 관리', icon: '◌' },
      { href: '/admin/news', label: '뉴스 큐', icon: '▤' },
      { href: '/admin/knowledge', label: '지식/퀘스트 큐', icon: '▧' },
      { href: '/admin/local-spots', label: '로컬 가게 관리', icon: '▩' },
      { href: '/admin/korean-biz-submissions', label: '한인 업소 제보', icon: '🏪' },
    ],
  },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await resolveAdminAccess())) {
    redirect('/');
  }

  return (
    <div className="admin-shell admin-shell--dashboard">
      <aside className="admin-shell__sidebar" aria-label="관리자 사이드바">
        <Link href="/admin" className="admin-shell__brand">
          <span className="admin-shell__brand-mark">TW</span>
          <span>
            <strong>2026 Taeja World</strong>
            <small>Owner Dashboard</small>
          </span>
        </Link>
        {adminSections.map((section) => (
          <section key={section.title} className="admin-shell__menu">
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="admin-shell__menu-link">
                    <span aria-hidden>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="admin-shell__sidebar-hint">운영 데이터는 인가된 오너만 접근 가능합니다.</p>
      </aside>
      <div className="admin-shell__viewport">
        <div className="admin-shell__viewport-inner">{children}</div>
      </div>
      <AdminMobileTabBar />
    </div>
  );
}
