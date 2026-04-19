'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KnowledgeLlmOutput } from '@/bots/actions/processAndPersistKnowledge';
import { KNOWLEDGE_STUB_SUMMARY_SNIPPET } from '@/lib/knowledge/knowledgeStubConstants';

export type KnowledgeQueueItem = {
  id: string;
  created_at: string;
  board_target: 'tips_board' | 'board_board';
  raw_url: string;
  raw_title: string;
  ko_title: string;
  ko_summary: string;
  /** 편집팀·이용자 안내(LLM 요약이 스텁일 때 게시에 사용) */
  ko_editorial_note: string;
  ko_checklist: string[];
  ko_cautions: string[];
  ko_tags: string[];
  th_title: string;
  th_summary: string;
  th_editorial_note: string;
  confidence_level: 'high' | 'medium' | 'low';
  novelty_score: number;
  usefulness_score: number;
};

function isStubKoSummary(s: string): boolean {
  return s.trim().includes(KNOWLEDGE_STUB_SUMMARY_SNIPPET);
}

export type KnowledgeQueueDiagnostics = {
  draftCount: number;
  publishedCount: number;
  rawRecentCount: number;
  knowledgeModeAuto: boolean;
};

export type OrphanRawKnowledgeItem = {
  id: string;
  title_original: string;
  external_url: string | null;
  fetched_at: string;
};

function parseLlmFields(cleanBody: unknown, rawTitle: string): Partial<KnowledgeQueueItem> {
  try {
    const llm =
      (typeof cleanBody === 'string' ? JSON.parse(cleanBody) : cleanBody) as Partial<KnowledgeLlmOutput>;
    return {
      board_target: llm.board_target ?? 'board_board',
      ko_title: llm.ko?.title?.trim() || rawTitle,
      ko_summary: llm.ko?.summary?.trim() || '',
      ko_editorial_note:
        typeof llm.ko?.editorial_note === 'string' ? llm.ko.editorial_note.trim() : '',
      ko_checklist: llm.ko?.checklist ?? [],
      ko_cautions: llm.ko?.cautions ?? [],
      ko_tags: llm.ko?.tags ?? [],
      th_title: llm.th?.title?.trim() || '',
      th_summary: llm.th?.summary?.trim() || '',
      th_editorial_note:
        typeof llm.th?.editorial_note === 'string' ? llm.th.editorial_note.trim() : '',
      confidence_level: llm.editorial_meta?.confidence_level ?? 'medium',
      novelty_score: llm.editorial_meta?.novelty_score ?? 50,
      usefulness_score: llm.editorial_meta?.usefulness_score ?? 50,
    };
  } catch {
    return {
      board_target: 'board_board',
      ko_title: rawTitle,
      ko_summary: '',
      ko_editorial_note: '',
      ko_checklist: [],
      ko_cautions: [],
      ko_tags: [],
      th_title: '',
      th_summary: '',
      th_editorial_note: '',
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

export default function KnowledgeQueueClient({
  items,
  diagnostics,
  orphanRawKnowledge = [],
}: {
  items: KnowledgeQueueItem[];
  diagnostics?: KnowledgeQueueDiagnostics | null;
  orphanRawKnowledge?: OrphanRawKnowledgeItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ensureBusyRawId, setEnsureBusyRawId] = useState<string | null>(null);
  const [ensureBulkBusy, setEnsureBulkBusy] = useState(false);
  const [reprocessBusyId, setReprocessBusyId] = useState<string | null>(null);
  const [bulkReprocessRunning, setBulkReprocessRunning] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<
      KnowledgeQueueItem,
      | 'ko_title'
      | 'ko_summary'
      | 'ko_editorial_note'
      | 'th_title'
      | 'th_summary'
      | 'th_editorial_note'
    >,
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
          ...(action === 'delete'
            ? {}
            : {
                ko_title: fields.ko_title,
                ko_summary: fields.ko_summary,
                ko_editorial_note: fields.ko_editorial_note,
                th_title: fields.th_title,
                th_summary: fields.th_summary,
                th_editorial_note: fields.th_editorial_note,
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
        setMsg(
          action === 'publish'
            ? '최종 승인: 광장(정보) + 비회원 /tips 허브에 반영했습니다.'
            : '초안 저장했습니다.',
        );
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function ensureDraftForRaw(rawKnowledgeId: string) {
    setMsg(null);
    setEnsureBusyRawId(rawKnowledgeId);
    try {
      const res = await fetch('/api/admin/knowledge-ensure-draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_knowledge_id: rawKnowledgeId }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        already_existed?: boolean;
      };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(j.already_existed ? '이미 초안이 있어 목록만 새로고침합니다.' : '승인 큐에 스텁 초안을 넣었습니다.');
      router.refresh();
    } finally {
      setEnsureBusyRawId(null);
    }
  }

  async function reprocessWithLlm(processedKnowledgeId: string) {
    setMsg(null);
    setReprocessBusyId(processedKnowledgeId);
    try {
      const res = await fetch('/api/admin/knowledge-reprocess-llm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processed_knowledge_id: processedKnowledgeId }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(
        '원문 URL에서 본문을 다시 가져와 LLM으로 초안을 다시 만들었습니다. 한·태 제목·요약을 확인한 뒤 게시하세요.',
      );
      router.refresh();
    } finally {
      setReprocessBusyId(null);
    }
  }

  /** 미게시 초안만, 5건씩 API 반복 — 제미나이·태자 편집 프롬프트 적용 (게시 완료 글 제외) */
  async function runBulkReprocessAll() {
    if (
      !window.confirm(
        '승인 대기 중인 지식 초안(published=false)을 전부, 원문 URL 재수집 + LLM으로 다시 만듭니다.\n\n' +
          '· 적용: 지금 서버에 넣은 제미나이 키 + 최신 태자 편집팀 프롬프트(한·태·editorial_note)\n' +
          '· 제외: 이미 광장에 게시된 항목은 건드리지 않습니다\n' +
          '· 범위: 지식 큐만 (/admin/news 뉴스 승인 큐는 별도)\n' +
          '· 실패 시 해당 건은 초안이 사라질 수 있으니(기존 단건 재가공과 동일) 봇 기록을 확인하세요\n\n' +
          '계속할까요?',
      )
    ) {
      return;
    }
    setBulkReprocessRunning(true);
    setMsg(null);
    let round = 0;
    let totalOk = 0;
    let totalFail = 0;
    try {
      for (;;) {
        round += 1;
        const res = await fetch('/api/admin/knowledge-reprocess-bulk', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_items: 5 }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          attempted?: number;
          succeeded?: number;
          failed?: number;
          remaining_unpublished?: number;
          details?: Array<{ old_processed_id: string; ok: boolean; error?: string }>;
        };
        if (!res.ok) {
          setMsg(j.error ?? `오류 (${res.status})`);
          break;
        }
        totalOk += j.succeeded ?? 0;
        totalFail += j.failed ?? 0;
        const rem = j.remaining_unpublished ?? 0;
        setMsg(
          `[일괄 재가공] 라운드 ${round} — 방금: 성공 ${j.succeeded ?? 0} · 실패 ${j.failed ?? 0} · 누적 성공 ${totalOk} · 미게시 남음 ${rem}건`,
        );
        await router.refresh();
        if (rem === 0) {
          setMsg(
            `전체 완료. 누적 성공 ${totalOk} · 누적 실패 ${totalFail}. 한·태·편집 메모를 확인한 뒤 승인·게시하세요.`,
          );
          break;
        }
        if ((j.attempted ?? 0) === 0) {
          setMsg(`처리할 미게시 초안이 없습니다. (남음 ${rem}건 표기는 참고)`);
          break;
        }
        if ((j.succeeded ?? 0) === 0 && (j.failed ?? 0) > 0) {
          const firstErr = j.details?.find((d) => d.error)?.error;
          setMsg(
            `라운드 ${round}에서 전부 실패했습니다. 제미나이 쿼터·환경 변수·네트워크를 확인하세요.${firstErr ? ` (${firstErr})` : ''}`,
          );
          break;
        }
      }
    } finally {
      setBulkReprocessRunning(false);
    }
  }

  async function ensureDraftBulk() {
    const n = Math.min(20, Math.max(1, orphanRawKnowledge.length || 15));
    if (
      !window.confirm(
        `DB에서 최근 순으로 processed 없는 지식 원문 최대 ${n}건에 스텁 초안을 만들까요?\n` +
          '(이미 초안이 생긴 건 건너뜁니다.)',
      )
    ) {
      return;
    }
    setEnsureBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/knowledge-ensure-draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk_limit: n }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: number;
        skipped_existing?: number;
        attempted?: number;
      };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(
        `처리 시도 ${j.attempted ?? n}건 · 새로 만든 초안 ${j.created ?? 0}건 · 이미 있던 건 ${j.skipped_existing ?? 0}건`,
      );
      router.refresh();
    } finally {
      setEnsureBulkBusy(false);
    }
  }

  async function runAiToneCleanup() {
    if (
      !window.confirm(
        '지식 관련 공개 텍스트(게시글/요약/clean_body)를 전수 스캔해 AI 티 문구(운영 샘플, 자동 초안, 이스케이프 줄바꿈)를 정리할까요?',
      )
    ) {
      return;
    }
    setCleanupRunning(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/knowledge-cleanup-ai-tone', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        posts_scanned?: number;
        posts_updated?: number;
        processed_scanned?: number;
        processed_updated?: number;
        summaries_scanned?: number;
        summaries_updated?: number;
      };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(
        `AI 톤 정리 완료 — posts ${j.posts_updated ?? 0}/${j.posts_scanned ?? 0}, clean_body ${j.processed_updated ?? 0}/${j.processed_scanned ?? 0}, summaries ${j.summaries_updated ?? 0}/${j.summaries_scanned ?? 0}`,
      );
      router.refresh();
    } finally {
      setCleanupRunning(false);
    }
  }

  const orphanPanel =
    orphanRawKnowledge.length > 0 ? (
      <div
        style={{
          marginBottom: 20,
          padding: 14,
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 10,
        }}
      >
        <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#78350f' }}>
          원문만 있는 지식 (processed_knowledge 없음) — {orphanRawKnowledge.length}건 표시
        </strong>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
          스텁은 비자·가이드 게시판용 JSON 초안입니다. «승인 큐에 올리기» 후 편집하고 «공개 보드에 게시»하세요.
        </p>
        <button
          type="button"
          disabled={ensureBulkBusy}
          onClick={() => void ensureDraftBulk()}
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: ensureBulkBusy ? 'wait' : 'pointer',
          }}
        >
          {ensureBulkBusy
            ? '처리 중…'
            : `고아 원문 최대 ${Math.min(20, Math.max(orphanRawKnowledge.length, 1))}건 한 번에 큐에 올리기`}
        </button>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#451a03', lineHeight: 1.6 }}>
          {orphanRawKnowledge.map((o) => (
            <li key={o.id} style={{ marginBottom: 8 }}>
              <a
                href={o.external_url?.trim() ? o.external_url : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#b45309' }}
              >
                {o.title_original.slice(0, 72)}
                {o.title_original.length > 72 ? '…' : ''}
              </a>
              <span style={{ color: '#9ca3af', marginLeft: 6 }}>({o.id.slice(0, 8)}…)</span>
              <button
                type="button"
                disabled={ensureBusyRawId === o.id || ensureBulkBusy}
                onClick={() => void ensureDraftForRaw(o.id)}
                style={{
                  marginLeft: 10,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: 6,
                  cursor: ensureBusyRawId === o.id ? 'wait' : 'pointer',
                }}
              >
                {ensureBusyRawId === o.id ? '…' : '승인 큐에 올리기'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const showBulkReprocess = items.length > 0 || (diagnostics?.draftCount ?? 0) > 0;

  const bulkReprocessBanner = showBulkReprocess ? (
    <div
      style={{
        marginBottom: 16,
        padding: 14,
        background: '#f5f3ff',
        border: '1px solid #c4b5fd',
        borderRadius: 10,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#5b21b6' }}>
        미게시 초안 일괄 재가공 (제미나이 + 태자 편집 프롬프트)
      </strong>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4c1d95', lineHeight: 1.55 }}>
        예전에 쌓인 스텁·옛 LLM 초안을 전부 다시 만듭니다. 한 번에 최대 5건씩 자동 반복하고,{' '}
        <strong>이미 게시된 글은 제외</strong>됩니다. 끝나면 목록에서 오타만 보고 승인하시면 됩니다.
      </p>
      <button
        type="button"
        disabled={
          bulkReprocessRunning ||
          cleanupRunning ||
          ensureBulkBusy ||
          Boolean(busyId) ||
          Boolean(reprocessBusyId)
        }
        onClick={() => void runBulkReprocessAll()}
        style={{
          padding: '10px 16px',
          background: '#6d28d9',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: bulkReprocessRunning ? 'wait' : 'pointer',
        }}
      >
        {bulkReprocessRunning ? '일괄 재가공 진행 중…' : '미게시 초안 전부 재가공 시작'}
      </button>
      <button
        type="button"
        disabled={
          cleanupRunning ||
          bulkReprocessRunning ||
          ensureBulkBusy ||
          Boolean(busyId) ||
          Boolean(reprocessBusyId)
        }
        onClick={() => void runAiToneCleanup()}
        style={{
          marginLeft: 8,
          padding: '10px 16px',
          background: '#fff',
          color: '#4c1d95',
          border: '1px solid #c4b5fd',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: cleanupRunning ? 'wait' : 'pointer',
        }}
      >
        {cleanupRunning ? 'AI 톤 전수 정리 중…' : 'AI 톤 전수 스캔·정리'}
      </button>
    </div>
  ) : null;

  if (items.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        {bulkReprocessBanner}
        {orphanPanel}
        {msg ? <p style={{ color: '#059669', fontSize: 13, marginBottom: 12 }}>{msg}</p> : null}
        <p style={{ color: '#6b7280', margin: '0 0 12px' }}>
          대기 중인 초안이 없습니다. 가공 파이프라인이 <code>processed_knowledge</code>를{' '}
          <code>published=false</code>로 넣으면 여기에 보입니다. 위 노란 칸에서 원문만 있는 항목을 큐에 올릴 수 있어요.
        </p>
        {diagnostics ? (
          <div
            style={{
              padding: 14,
              background: '#f9fafb',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              lineHeight: 1.55,
              color: '#374151',
            }}
          >
            <strong style={{ display: 'block', marginBottom: 8 }}>DB 요약(지금)</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                승인 대기 초안: <strong>{diagnostics.draftCount}</strong>건
              </li>
              <li>
                이미 공개 처리분: <strong>{diagnostics.publishedCount}</strong>건
              </li>
              <li>
                최근 14일 수집 원문(raw_knowledge): <strong>{diagnostics.rawRecentCount}</strong>건
              </li>
              <li>
                배포 지식 모드:{' '}
                <strong>
                  {diagnostics.knowledgeModeAuto ? 'auto (초안 생략 가능)' : 'manual/기본 (초안 큐)'}
                </strong>
              </li>
            </ul>
            {diagnostics.rawRecentCount > 0 && diagnostics.draftCount === 0 ? (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: '#92400e' }}>
                원문은 있는데 초안이 0이면, 지식 가공 크론/LLM이 아직 안 돌았거나 실패했을 수 있어요.{' '}
                <a href="/admin/bot-actions" style={{ color: '#2563eb' }}>
                  봇 기록
                </a>
                을 확인해 보세요.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
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
      {bulkReprocessBanner}
      {orphanPanel}
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
                <DraftCard
                  key={it.id}
                  item={it}
                  busy={busyId === it.id}
                  reprocessBusy={reprocessBusyId === it.id}
                  onSubmit={submit}
                  onReprocessLlm={() => void reprocessWithLlm(it.id)}
                />
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
  reprocessBusy,
  onSubmit,
  onReprocessLlm,
}: {
  item: KnowledgeQueueItem;
  busy: boolean;
  reprocessBusy: boolean;
  onSubmit: (
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<
      KnowledgeQueueItem,
      | 'ko_title'
      | 'ko_summary'
      | 'ko_editorial_note'
      | 'th_title'
      | 'th_summary'
      | 'th_editorial_note'
    >,
  ) => Promise<void>;
  onReprocessLlm: () => void;
}) {
  const [koTitle, setKoTitle] = useState(item.ko_title);
  const [koSummary, setKoSummary] = useState(item.ko_summary);
  const [koEditorialNote, setKoEditorialNote] = useState(item.ko_editorial_note);
  const [thTitle, setThTitle] = useState(item.th_title);
  const [thSummary, setThSummary] = useState(item.th_summary);
  const [thEditorialNote, setThEditorialNote] = useState(item.th_editorial_note);
  const [showDetail, setShowDetail] = useState(false);

  const stubLike = isStubKoSummary(koSummary);

  const fields = () => ({
    ko_title: koTitle,
    ko_summary: koSummary,
    ko_editorial_note: koEditorialNote,
    th_title: thTitle,
    th_summary: thSummary,
    th_editorial_note: thEditorialNote,
  });

  function tryPublish() {
    const f = fields();
    if (isStubKoSummary(f.ko_summary) && f.ko_editorial_note.trim().length < 25) {
      window.alert(
        '원문 요약이 비어 있는 스텁일 때는 「태자 편집팀·이용자 안내」에 25자 이상 적어 주세요. 그 내용으로 광장·/tips 훅에도 쓰입니다.',
      );
      return;
    }
    if (!isStubKoSummary(f.ko_summary) && f.ko_summary.trim().length < 10) {
      window.alert('한국어 요약을 10자 이상 작성해 주세요.');
      return;
    }
    void onSubmit(item.id, 'publish', f);
  }

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
      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', lineHeight: 1.45 }}>
        앞부분은 비회원 /tips 에 보이는 <strong>클릭 유도 훅</strong>으로 쓰입니다. 과장·거짓은 피하고, 출처 범위 안에서
        궁금증이 나게 다듬은 뒤 게시하세요.
      </p>
      <textarea
        value={koSummary}
        onChange={(e) => setKoSummary(e.target.value)}
        rows={4}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }}
      />

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        태자 편집팀·이용자 안내 <span style={{ fontWeight: 400, color: '#6b7280' }}>(선택 — LLM이 editorial_note로 미리 채울 수 있음, 스텁일 때 필수)</span>
      </label>
      {stubLike ? (
        <p
          style={{
            margin: '0 0 6px',
            padding: '8px 10px',
            fontSize: 12,
            lineHeight: 1.5,
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 6,
            color: '#92400e',
          }}
        >
          위 한국어 요약이 «원문이 비었다»는 스텁이면, <strong>여기에 편집팀 생각·이용자가 이해하기 쉬운 풀어쓰기</strong>를
          25자 이상 적으면 그대로 최종 승인·게시할 수 있어요. /tips 짧은 훅도 이 안내를 우선 씁니다.
        </p>
      ) : (
        <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', lineHeight: 1.45 }}>
          LLM 요약이 짧거나 부족할 때 덧붙이는 설명입니다. 적으면 광장 글 본문에 「태자 편집팀·이용자 안내」로 붙고, 요약과 함께
          훅 문구에도 반영됩니다.
        </p>
      )}
      <textarea
        value={koEditorialNote}
        onChange={(e) => setKoEditorialNote(e.target.value)}
        rows={5}
        placeholder="예: 이 기사는 ○○ 사기 경고입니다. 태국 체류 중 ○○에 해당하면 …"
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
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            หมายเหตุทีมบรรณาธิการ <span style={{ fontWeight: 400, color: '#6b7280' }}>(ไม่บังคับ)</span>
          </label>
          <textarea
            value={thEditorialNote}
            onChange={(e) => setThEditorialNote(e.target.value)}
            rows={3}
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          disabled={busy || reprocessBusy}
          onClick={() => {
            if (
              !window.confirm(
                '이 초안을 삭제한 뒤, 원문 URL에서 본문을 다시 가져와 LLM으로 처음부터 다시 만듭니다. 편집 중이던 내용은 사라집니다. 계속할까요?',
              )
            ) {
              return;
            }
            onReprocessLlm();
          }}
          style={{
            padding: '8px 14px',
            background: '#eef2ff',
            color: '#4338ca',
            border: '1px solid #a5b4fc',
            borderRadius: 6,
            cursor: busy || reprocessBusy ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {reprocessBusy ? '재가공 중…' : '원문 다시 불러와 LLM 재가공'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => tryPublish()}
          style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontSize: 13 }}
        >
          최종 승인 · 게시
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
