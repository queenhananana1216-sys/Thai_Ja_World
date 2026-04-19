'use client';

import Link from 'next/link';

export default function GlobalRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-body board-page">
      <div className="card" style={{ padding: 24 }}>
        <h1 className="board-title" style={{ marginBottom: 10 }}>
          잠시 연결이 불안정해요
        </h1>
        <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
          페이지를 다시 불러오면 대부분 바로 복구됩니다. 문제가 계속되면 홈이나 광장에서 다시 시작해 주세요.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="board-form__submit" onClick={() => reset()}>
            다시 시도
          </button>
          <Link
            href="/"
            className="board-form__submit"
            style={{
              textAlign: 'center',
              background: '#fff',
              color: 'var(--tj-ink)',
              border: '1px solid var(--tj-line)',
            }}
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
