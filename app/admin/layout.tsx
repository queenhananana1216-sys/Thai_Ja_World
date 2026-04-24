/**
 * app/admin/layout.tsx — 관리자 영역 레이아웃
 *
 * ADMIN_ALLOWED_EMAILS 가 비어 있지 않으면 해당 이메일만 접근.
 * 비어 있으면(개발용) 로그인한 계정만 허용.
 * 권한 없음·미로그인은 홈으로 보내지 않고 404(notFound)로 처리합니다.
 */

import type { ReactNode } from 'react';
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

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await resolveAdminAccess())) {
    notFound();
  }

  return (
    <div className="admin-shell">
      <nav className="admin-shell__nav" aria-label="관리자 하위 메뉴">
        <a href="/admin" className="admin-shell__nav-brand">
          태자 월드 · 개요
        </a>
        <a href="/admin/users">이용자</a>
        <a href="/admin/bot-actions">봇 기록</a>
        <a href="/admin/ops-center">운영 통합센터</a>
        <a href="/admin/publish">최종 승인</a>
        <a href="/admin/news">뉴스 승인</a>
        <a href="/admin/knowledge">지식 큐</a>
        <a href="/admin/local-spots">로컬 가게</a>
        <a href="/admin/community-posts">광장 글</a>
        <a href="/admin/premium-banners">프리미엄 배너</a>
        <a href="/admin/home-hero">홈 메인 문구</a>
        <span className="admin-shell__nav-hint">운영 데이터 — 인가된 접근만 허용</span>
      </nav>
      <div className="admin-shell__viewport">{children}</div>
    </div>
  );
}
