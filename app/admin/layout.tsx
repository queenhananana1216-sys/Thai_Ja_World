/**
 * app/admin/layout.tsx — 관리자 영역 레이아웃
 *
 * .env 에 ADMIN_ALLOWED_EMAILS 를 넣으면 해당 이메일로 로그인한 계정만 접근.
 * 비우면(기본) 미들웨어와 같이 «로그인만» 되면 접근 가능(소규모·개발용).
 */

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const metadata = {
  title: '태자 월드 — 관리자',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const allowed = parseAdminAllowedEmails();
  if (allowed.length > 0) {
    const supabase = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase();
    if (!email || !allowed.includes(email)) {
      redirect('/');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: "'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
        fontSize: '13px',
        background: '#ffffff',
        color: '#111827',
      }}
    >
      <nav
        style={{
          padding: '10px 24px',
          background: '#1e1e2e',
          color: '#cdd6f4',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
        }}
      >
        <a href="/admin" style={{ fontWeight: 700, color: '#cba6f7', textDecoration: 'none' }}>
          태자 월드 · 개요
        </a>
        <a href="/admin/users" style={{ color: '#89b4fa', textDecoration: 'none' }}>
          users
        </a>
        <a
          href="/admin/bot-actions"
          style={{ color: '#89b4fa', textDecoration: 'none' }}
        >
          bot_actions
        </a>
        <a href="/admin/news" style={{ color: '#89b4fa', textDecoration: 'none' }}>
          news_queue
        </a>
        <span
          style={{
            marginLeft: 'auto',
            color: '#6c7086',
            fontSize: '11px',
          }}
        >
          ⚠ 운영 데이터 — 인가된 접근만 허용
        </span>
      </nav>
      {children}
    </div>
  );
}

