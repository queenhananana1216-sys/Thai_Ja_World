/**
 * app/admin/layout.tsx — 관리자 영역 레이아웃
 *
 * ADMIN_ALLOWED_EMAILS 가 비어 있지 않으면 해당 이메일만 접근.
 * 비어 있으면(개발용) 로그인한 계정만 허용.
 * 권한 없음·미로그인은 홈으로 보내지 않고 404(notFound)로 처리합니다.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
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
    title: '배너 · 노출 제어',
    items: [
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
    ],
  },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await resolveAdminAccess())) {
    notFound();
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
    </div>
  );
}
