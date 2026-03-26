'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KnowledgeLlmOutput } from '@/bots/actions/processAndPersistKnowledge';

export type KnowledgeQueueItem = {
  id: string;
  created_at: string;
  board_target: 'tips_board' | 'board_board';
  raw_url: string;
  raw_title: string;
  ko_title: string;
  ko_summary: string;
  ko_checklist: string[];
  ko_cautions: string[];
  ko_tags: string[];
  th_title: string;
  th_summary: string;
  confidence_level: 'high' | 'medium' | 'low';
  novelty_score: number;
  usefulness_score: number;
};

function parseLlmFields(cleanBody: unknown, rawTitle: string): Partial<KnowledgeQueueItem> {
  try {
    const llm =
      (typeof cleanBody === 'string' ? JSON.parse(cleanBody) : cleanBody) as Partial<KnowledgeLlmOutput>;
    return {
      board_target: llm.board_target ?? 'board_board',
      ko_title: llm.ko?.title?.trim() || rawTitle,
      ko_summary: llm.ko?.summary?.trim() || '',
      ko_checklist: llm.ko?.checklist ?? [],
      ko_cautions: llm.ko?.cautions ?? [],
      ko_tags: llm.ko?.tags ?? [],
      th_title: llm.th?.title?.trim() || '',
      th_summary: llm.th?.summary?.trim() || '',
      confidence_level: llm.editorial_meta?.confidence_level ?? 'medium',
      novelty_score: llm.editorial_meta?.novelty_score ?? 50,
      usefulness_score: llm.editorial_meta?.usefulness_score ?? 50,
    };
  } catch {
    return {
      board_target: 'board_board',
      ko_title: rawTitle,
      ko_summary: '',
      ko_checklist: [],
      ko_cautions: [],
      ko_tags: [],
      th_title: '',
      th_summary: '',
      confidence_level: 'low',
      novelty_score: 0,
      usefulness_score: 0,
    };
  }
}

export { parseLlmFields };

// ── 색상 헬퍼 ──────────────────────────────────────────────────────────────
function confidenceColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return '#059669';
  if (level === 'medium') return '#d97706';
  return '#dc2626';
}

function boardBadgeStyle(target: 'tips_board' | 'board_board'): React.CSSProperties {
  return target === 'tips_board'
    ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
    : { background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' };
}

function boardLabel(target: 'tips_board' | 'board_board'): string {
  return target === 'tips_board' ? '꿀팁 한 스푼' : '비자·가이드 게시판';
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function KnowledgeQueueClient({ items }: { items: KnowledgeQueueItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<KnowledgeQueueItem, 'ko_title' | 'ko_summary' | 'th_title' | 'th_summary'>,
  ) {
    setMsg(null);
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/knowledge-queue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_knowledge_id: id,
          action,
          ...(action === 'delete' ? {} : {
            ko_title: fields.ko_title,
            ko_summary: fields.ko_summary,
            th_title: fields.th_title,
            th_summary: fields.th_summary,
          }),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      if (action === 'delete') {
        setMsg('삭제했습니다. (원문·요약·관련 데이터가 DB에서 함께 제거됩니다)');
      } else {
        setMsg(action === 'publish' ? '공개 보드에 게시했습니다.' : '초안 저장했습니다.');
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p style={{ color: '#6b7280', marginTop: 16 }}>
        대기 중인 초안이 없습니다.{' '}
        <code>KNOWLEDGE_PUBLISH_MODE=manual</code> 이고 LLM 처리가 완료되면 여기에 쌓입니다.
      </p>
    );
  }

  // board_target 별 그룹
  const byBoard = new Map<string, KnowledgeQueueItem[]>();
  for (const it of items) {
    const list = byBoard.get(it.board_target) ?? [];
    list.push(it);
    byBoard.set(it.board_target, list);
  }

  const boardOrder: Array<'tips_board' | 'board_board'> = ['board_board', 'tips_board'];

  return (
    <div style={{ marginTop: 12 }}>
      {msg ? <p style={{ color: '#059669', fontSize: 13, marginBottom: 12 }}>{msg}</p> : null}
      {boardOrder.map((board) => {
        const list = byBoard.get(board);
        if (!list?.length) return null;
        return (
          <section key={board} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...boardBadgeStyle(board), padding: '2px 10px', borderRadius: 12, fontSize: 13 }}>
                {boardLabel(board)}
              </span>
              <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 13 }}>({list.length}건)</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {list.map((it) => (
                <DraftCard key={it.id} item={it} busy={busyId === it.id} onSubmit={submit} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── 카드 컴포넌트 ─────────────────────────────────────────────────────────

function DraftCard({
  item,
  busy,
  onSubmit,
}: {
  item: KnowledgeQueueItem;
  busy: boolean;
  onSubmit: (
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<KnowledgeQueueItem, 'ko_title' | 'ko_summary' | 'th_title' | 'th_summary'>,
  ) => Promise<void>;
}) {
  const [koTitle, setKoTitle] = useState(item.ko_title);
  const [koSummary, setKoSummary] = useState(item.ko_summary);
  const [thTitle, setThTitle] = useState(item.th_title);
  const [thSummary, setThSummary] = useState(item.th_summary);
  const [showDetail, setShowDetail] = useState(false);

  const fields = () => ({ ko_title: koTitle, ko_summary: koSummary, th_title: thTitle, th_summary: thSummary });

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fafafa' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span style={{ ...boardBadgeStyle(item.board_target), padding: '2px 8px', borderRadius: 10, fontSize: 11, whiteSpace: 'nowrap' }}>
          {boardLabel(item.board_target)}
        </span>
        <span
          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f3f4f6', color: confidenceColor(item.confidence_level), border: '1px solid #e5e7eb' }}
        >
          신뢰도: {item.confidence_level} · 유용성: {item.usefulness_score}
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
          {new Date(item.created_at).toLocaleString('ko-KR')}
        </span>
      </div>

      {/* 원문 링크 */}
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af' }}>
        원문 ·{' '}
        <a href={item.raw_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
          {item.raw_title.slice(0, 90)}{item.raw_title.length > 90 ? '…' : ''}
        </a>
      </p>

      {/* 한국어 */}
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>한국어 제목</label>
      <input
        value={koTitle}
        onChange={(e) => setKoTitle(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
      />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>한국어 요약</label>
      <textarea
        value={koSummary}
        onChange={(e) => setKoSummary(e.target.value)}
        rows={4}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
      />

      {/* 태국어 (접힘/펼침) */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}
      >
        {showDetail ? '▲ 태국어·체크리스트·주의사항 접기' : '▼ 태국어·체크리스트·주의사항 보기'}
      </button>

      {showDetail && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ไทย หัวข้อ</label>
          <input
            value={thTitle}
            onChange={(e) => setThTitle(e.target.value)}
            style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ไทย สรุป</label>
          <textarea
            value={thSummary}
            onChange={(e) => setThSummary(e.target.value)}
            rows={4}
            style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
          />

          {item.ko_checklist.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>체크리스트</p>
              <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: 12, color: '#374151' }}>
                {item.ko_checklist.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
          {item.ko_cautions.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px', color: '#b45309' }}>⚠ 주의사항</p>
              <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: 12, color: '#b45309' }}>
                {item.ko_cautions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
          {item.ko_tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {item.ko_tags.map((t, i) => (
                <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 8, fontSize: 11 }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(item.id, 'publish', fields())}
          style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
        >
          보드에 게시
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(item.id, 'draft', fields())}
          style={{ padding: '8px 14px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
        >
          초안만 저장
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`"${item.ko_title.slice(0, 50)}" — 원문·요약까지 DB에서 삭제합니다. 계속하시겠습니까?`)) return;
            void onSubmit(item.id, 'delete', fields());
          }}
          style={{ padding: '8px 14px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
