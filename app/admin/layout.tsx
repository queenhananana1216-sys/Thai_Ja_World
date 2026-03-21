/**
 * app/admin/layout.tsx — 관리자 영역 레이아웃
 *
 * TODO (Phase 3 보안 강화):
 *   1. middleware.ts 에서 JWT 또는 API 키 검증 추가
 *   2. Supabase Auth 기반 세션 체크 또는 Next-Auth 연동
 *   현재는 내부 개발/운영 환경 전용입니다.
 */

import type { ReactNode } from 'react';

export const metadata = {
  title: '태자 월드 — Bot 관리 콘솔',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
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
          <span style={{ fontWeight: 700, color: '#cba6f7' }}>
            태자 월드 Bot Console
          </span>
          <a
            href="/admin/bot-actions"
            style={{ color: '#89b4fa', textDecoration: 'none' }}
          >
            bot_actions
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
      </body>
    </html>
  );
}
