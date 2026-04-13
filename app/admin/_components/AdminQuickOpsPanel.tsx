'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ActionState = {
  busy: boolean;
  message: string;
  tone: 'idle' | 'ok' | 'error';
};

const idleState: ActionState = { busy: false, message: '', tone: 'idle' };

export default function AdminQuickOpsPanel() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(idleState);

  async function runPipeline() {
    setState({ busy: true, message: '파이프라인 실행 중...', tone: 'idle' });
    try {
      const res = await fetch('/api/admin/ops/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' }),
      });
      const body = (await res.json()) as {
        status?: 'ok' | 'partial' | 'error';
        error?: string;
        results?: Array<{ success: boolean; skipped: boolean }>;
      };
      if (!res.ok || body.status === 'error') {
        throw new Error(body.error || '파이프라인 실행 실패');
      }
      const rows = Array.isArray(body.results) ? body.results : [];
      const failed = rows.filter((r) => !r.success).length;
      const skipped = rows.filter((r) => r.skipped).length;
      const ran = rows.length - skipped;
      setState({
        busy: false,
        message: failed > 0 ? `일부 실패: ${failed}건 실패` : `실행 완료: ${ran}건 실행`,
        tone: failed > 0 ? 'error' : 'ok',
      });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ busy: false, message: msg, tone: 'error' });
    }
  }

  async function applyNow() {
    setState({ busy: true, message: '승인 적용 중...', tone: 'idle' });
    try {
      const [newsRes, knowledgeRes] = await Promise.all([
        fetch('/api/admin/news-queue-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 80 }),
        }),
        fetch('/api/admin/knowledge-queue-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'all' }),
        }),
      ]);
      const news = (await newsRes.json()) as { updated?: number; error?: string };
      const knowledge = (await knowledgeRes.json()) as { succeeded?: number; error?: string };
      if (!newsRes.ok) throw new Error(news.error || '뉴스 일괄 적용 실패');
      if (!knowledgeRes.ok) throw new Error(knowledge.error || '꿀정보 일괄 적용 실패');
      setState({
        busy: false,
        message: `적용 완료: 뉴스 ${news.updated ?? 0}건, 꿀정보 ${knowledge.succeeded ?? 0}건`,
        tone: 'ok',
      });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ busy: false, message: msg, tone: 'error' });
    }
  }

  const msgColor = state.tone === 'error' ? '#b91c1c' : state.tone === 'ok' ? '#166534' : '#475569';

  return (
    <section
      style={{
        marginBottom: 16,
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        padding: 14,
      }}
      aria-label="관리자 빠른 실행"
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>빠른 실행</h2>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
        복잡한 메뉴 없이 아래 두 버튼만 누르면 됩니다.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => void runPipeline()}
          disabled={state.busy}
          style={{
            border: '1px solid #0f172a',
            borderRadius: 8,
            background: state.busy ? '#cbd5e1' : '#0f172a',
            color: state.busy ? '#334155' : '#fff',
            fontWeight: 700,
            fontSize: 12,
            padding: '8px 12px',
            cursor: state.busy ? 'not-allowed' : 'pointer',
          }}
        >
          안 돌았으면 돌리기
        </button>
        <button
          type="button"
          onClick={() => void applyNow()}
          disabled={state.busy}
          style={{
            border: '1px solid #334155',
            borderRadius: 8,
            background: '#fff',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: 12,
            padding: '8px 12px',
            cursor: state.busy ? 'not-allowed' : 'pointer',
          }}
        >
          적용하기
        </button>
        {state.message ? <span style={{ fontSize: 12, color: msgColor }}>{state.message}</span> : null}
      </div>
    </section>
  );
}

