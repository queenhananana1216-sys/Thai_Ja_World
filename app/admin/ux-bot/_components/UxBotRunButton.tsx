'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RunResult = {
  status: 'idle' | 'running' | 'ok' | 'error';
  message: string;
};

export default function UxBotRunButton() {
  const router = useRouter();
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [result, setResult] = useState<RunResult>({ status: 'idle', message: '' });

  async function runNow() {
    setResult({ status: 'running', message: 'UX 관리자봇 실행 중...' });
    try {
      const res = await fetch('/api/admin/ux-bot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowMinutes }),
      });
      const body = (await res.json()) as {
        status?: string;
        error?: string;
        run_id?: string;
      };
      if (!res.ok || body.status !== 'ok') {
        throw new Error(body.error || '실행 실패');
      }
      setResult({ status: 'ok', message: `실행 완료 (run_id: ${body.run_id ?? 'unknown'})` });
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setResult({ status: 'error', message });
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#475569' }}>
        분석 구간(분){' '}
        <select
          value={windowMinutes}
          onChange={(e) => setWindowMinutes(Number(e.target.value))}
          style={{ marginLeft: 4, borderRadius: 6, border: '1px solid #cbd5e1', padding: '4px 6px' }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => void runNow()}
        disabled={result.status === 'running'}
        style={{
          border: '1px solid #0f172a',
          background: result.status === 'running' ? '#e2e8f0' : '#0f172a',
          color: result.status === 'running' ? '#475569' : '#fff',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: result.status === 'running' ? 'not-allowed' : 'pointer',
        }}
      >
        {result.status === 'running' ? '실행 중...' : '지금 최적화 실행'}
      </button>
      {result.message ? (
        <span
          style={{
            fontSize: 12,
            color:
              result.status === 'error' ? '#dc2626' : result.status === 'ok' ? '#166534' : '#334155',
          }}
        >
          {result.message}
        </span>
      ) : null}
    </div>
  );
}

