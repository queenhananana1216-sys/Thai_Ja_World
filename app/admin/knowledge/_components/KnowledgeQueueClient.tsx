'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';
import { isKnowledgeStubKoSummary } from '@/lib/knowledge/knowledgeStubConstants';
import { buildPostContent, excerptFromKnowledgeKo, validateKnowledgePublish } from '@/lib/knowledge/knowledgePostBodyShared';
import { knowledgeLlmFromQueueFields } from '@/lib/knowledge/knowledgeQueuePreview';

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

export type KnowledgeQueueDiagnostics = {
  draftCount: number;
  publishedCount: number;
  rawRecentCount: number;
  knowledgeModeAuto: boolean;
  /** 이 요청을 처리한 서버(보통 Vercel) 기준 LLM 키 존재 여부 */
  knowledgeLlmConfigured: boolean;
  /** NEWS_SUMMARY_PROVIDER (미설정이면 auto) */
  knowledgeLlmProviderSetting: 'openai' | 'gemini' | 'local' | 'auto';
};

function providerSettingLabel(p: KnowledgeQueueDiagnostics['knowledgeLlmProviderSetting']): string {
  if (p === 'openai') return 'OpenAI만';
  if (p === 'gemini') return 'Gemini만';
  if (p === 'local') return '로컬 LLM만';
  return '자동(키 있는 순 OpenAI→Gemini→로컬)';
}

/** 배포에 LLM 키가 없을 때 스텁만 쌓이는 이유를 한눈에 */
function KnowledgeLlmEnvBanner({ diagnostics }: { diagnostics?: KnowledgeQueueDiagnostics | null }) {
  if (!diagnostics || diagnostics.knowledgeLlmConfigured) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 10,
        fontSize: 13,
        lineHeight: 1.6,
        color: '#7f1d1d',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
        LLM이 꺼져 있어 초안이 전부 «가공 전» 스텁으로만 들어옵니다
      </strong>
      <p style={{ margin: '0 0 10px' }}>
        이 서버 환경에 <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code>, <code>LOCAL_LLM_BASE_URL</code> 중{' '}
        <strong>하나도 없습니다</strong>(또는 <code>NEWS_SUMMARY_PROVIDER</code>와 짝이 안 맞습니다). 수집(raw)은 될 수
        있어도 한·태 구조화 가공은 되지 않습니다.
      </p>
      <ol style={{ margin: '0 0 10px', paddingLeft: 20 }}>
        <li>
          Vercel(또는 호스팅) → 프로젝트 → <strong>Settings → Environment Variables</strong>에 키 추가
        </li>
        <li>
          <strong>Redeploy</strong>로 반영
        </li>
        <li>
          이 페이지에서 <strong>「스텁 …건 순서대로 LLM 재가공」</strong> 또는 카드별{' '}
          <strong>「원문 다시 불러와 LLM 재가공」</strong>
        </li>
      </ol>
      <p style={{ margin: 0, fontSize: 12, color: '#991b1b' }}>
        현재 <code>NEWS_SUMMARY_PROVIDER</code> 동작: <strong>{providerSettingLabel(diagnostics.knowledgeLlmProviderSetting)}</strong>
      </p>
    </div>
  );
}

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

/** 스텁·LLM 미가공 초안만 골라 순차 재가공 (요청당 타임아웃을 피하려 한 건씩 API 호출) */
function StubLlmBulkToolbar({
  items,
  busy,
  progress,
  onStart,
}: {
  items: KnowledgeQueueItem[];
  busy: boolean;
  progress: string | null;
  onStart: () => void;
}) {
  const stubItems = items.filter((it) => isKnowledgeStubKoSummary(it.ko_summary));
  const n = stubItems.length;
  if (n === 0) return null;

  return (
    <div
      style={{
        marginBottom: 18,
        padding: 14,
        background: '#fff7ed',
        border: '1px solid #fdba74',
        borderRadius: 10,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#9a3412' }}>
        LLM 미가공 초안 일괄 가공
      </strong>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#c2410c', lineHeight: 1.55 }}>
        한국어 요약에 «<strong>LLM 가공 전</strong>»·발췌 스텁 등이 보이는 초안이{' '}
        <strong>{n}건</strong> 있습니다. 아래를 누르면 각각{' '}
        <strong>원문 URL → 본문 수집 → LLM 구조화</strong>를 다시 돌립니다. 배포 환경에{' '}
        <code>GEMINI_API_KEY</code> 또는 <code>OPENAI_API_KEY</code> 등이 있어야 합니다. 건당 수십 초 걸릴 수 있어{' '}
        {n}건이면 수 분 이상 걸릴 수 있고, <strong>탭을 닫지 마세요</strong>.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => onStart()}
        style={{
          padding: '10px 16px',
          background: '#ea580c',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? progress ?? '처리 중…' : `스텁 ${n}건 순서대로 LLM 재가공`}
      </button>
      {busy && progress ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9a3412' }}>{progress}</p>
      ) : null}
    </div>
  );
}

function BulkPublishToolbar({ items }: { items: KnowledgeQueueItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'tips' | 'all' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const tipsCount = items.filter((x) => x.board_target === 'tips_board').length;
  const total = items.length;

  async function run(scope: 'tips_board' | 'all') {
    const label =
      scope === 'tips_board'
        ? `꿀팁(한 스푼) 초안 ${tipsCount}건`
        : `이 화면의 모든 초안 ${total}건(비자·가이드 포함)`;
    if (
      !window.confirm(
        `${label}을(를) 최대 80건까지 DB에 저장된 제목·요약 그대로 최종 승인할까요?\n` +
          '요약이 너무 짧거나 스텁인 건은 건너뛰고, 실패 목록은 알림으로 확인할 수 있습니다.',
      )
    ) {
      return;
    }
    setMsg(null);
    setBusy(scope === 'tips_board' ? 'tips' : 'all');
    try {
      const res = await fetch('/api/admin/knowledge-queue-bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        succeeded?: number;
        failed?: number;
        results?: { id: string; ok: boolean; error?: string }[];
      };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      const fails = (j.results ?? []).filter((r) => !r.ok);
      const failSample = fails
        .slice(0, 5)
        .map((r) => `${r.id.slice(0, 8)}… ${r.error ?? ''}`)
        .join(' | ');
      setMsg(
        `일괄 승인 완료: 성공 ${j.succeeded ?? 0}건, 실패 ${j.failed ?? 0}건.` +
          (failSample ? ` 실패 예시: ${failSample}` : ''),
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (total === 0) return null;

  return (
    <div
      style={{
        marginBottom: 18,
        padding: 14,
        background: '#eef2ff',
        border: '1px solid #c7d2fe',
        borderRadius: 10,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#312e81' }}>일괄 최종 승인 (배포)</strong>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4338ca', lineHeight: 1.55 }}>
        위쪽 주황 칸에서 «LLM 미가공» 스텁을 먼저 재가공한 뒤 쓰는 것을 권장합니다. 요약이 스텁이면 편집팀 안내 25자 없이는 일괄 승인이
        막힙니다. 가공이 끝난 초안만 여기서 한 번에 공개할 수 있어요. 각 카드의 <strong>미리보기</strong>는 이용자 광장 글 본문·발췌와 같은
        규칙입니다.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          disabled={busy !== null || tipsCount === 0}
          onClick={() => void run('tips_board')}
          style={{
            padding: '10px 14px',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: busy || tipsCount === 0 ? 'not-allowed' : 'pointer',
            opacity: tipsCount === 0 ? 0.5 : 1,
          }}
        >
          {busy === 'tips' ? '처리 중…' : `꿀팁 한 스푼만 일괄 승인 (${tipsCount}건)`}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('all')}
          style={{
            padding: '10px 14px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy === 'all' ? '처리 중…' : `전체 초안 일괄 승인 (${total}건)`}
        </button>
      </div>
      {msg ? <p style={{ margin: '10px 0 0', fontSize: 13, color: '#3730a3' }}>{msg}</p> : null}
    </div>
  );
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
  const [bulkLlmBusy, setBulkLlmBusy] = useState(false);
  const [bulkLlmProgress, setBulkLlmProgress] = useState<string | null>(null);
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

  async function reprocessAllStubsWithLlm() {
    const targets = items.filter((it) => isKnowledgeStubKoSummary(it.ko_summary));
    if (targets.length === 0) {
      setMsg('LLM 미가공으로 보이는 초안이 없습니다.');
      return;
    }
    if (
      !window.confirm(
        `스텁·발췌 초안 ${targets.length}건을 순서대로 LLM 재가공합니다.\n` +
          '원문 URL에서 본문을 다시 가져옵니다. 건당 수십 초~1분 이상 걸릴 수 있으며, 전체는 수 분 이상 걸릴 수 있습니다.\n' +
          '진행 중에는 이 탭을 닫지 마세요. 계속할까요?',
      )
    ) {
      return;
    }
    setBulkLlmBusy(true);
    setBulkLlmProgress(null);
    setMsg(null);
    let ok = 0;
    let fail = 0;
    const failSamples: string[] = [];
    for (let i = 0; i < targets.length; i++) {
      const it = targets[i]!;
      setBulkLlmProgress(`${i + 1}/${targets.length} — ${it!.ko_title.slice(0, 36)}${it!.ko_title.length > 36 ? '…' : ''}`);
      try {
        const res = await fetch('/api/admin/knowledge-reprocess-llm', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processed_knowledge_id: it.id }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          fail += 1;
          if (failSamples.length < 5) {
            failSamples.push(`${it.ko_title.slice(0, 28) || it.id.slice(0, 8)}: ${j.error ?? String(res.status)}`);
          }
        } else {
          ok += 1;
        }
      } catch {
        fail += 1;
        if (failSamples.length < 5) {
          failSamples.push(`${it.ko_title.slice(0, 28) || it.id.slice(0, 8)}: 네트워크 오류`);
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setBulkLlmProgress(null);
    setBulkLlmBusy(false);
    setMsg(
      `LLM 일괄 재가공 완료: 성공 ${ok}건, 실패 ${fail}건.` +
        (failSamples.length ? ` 실패 예: ${failSamples.join(' | ')}` : '') +
        ' 목록을 새로고침합니다.',
    );
    router.refresh();
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

  if (items.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <KnowledgeLlmEnvBanner diagnostics={diagnostics} />
        {orphanPanel}
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
              <li>
                LLM(이 서버):{' '}
                <strong style={{ color: diagnostics.knowledgeLlmConfigured ? '#059669' : '#b91c1c' }}>
                  {diagnostics.knowledgeLlmConfigured
                    ? `설정됨 — ${providerSettingLabel(diagnostics.knowledgeLlmProviderSetting)}`
                    : '미설정 — 스텁만 생성됨'}
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
      <KnowledgeLlmEnvBanner diagnostics={diagnostics} />
      <StubLlmBulkToolbar
        items={items}
        busy={bulkLlmBusy}
        progress={bulkLlmProgress}
        onStart={() => void reprocessAllStubsWithLlm()}
      />
      <BulkPublishToolbar items={items} />
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
  const [showPreview, setShowPreview] = useState(true);

  const stubLike = isKnowledgeStubKoSummary(koSummary);

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
    const v = validateKnowledgePublish(f.ko_summary, f.ko_editorial_note);
    if (v) {
      window.alert(v);
      return;
    }
    void onSubmit(item.id, 'publish', f);
  }

  const previewLlm = knowledgeLlmFromQueueFields(item, fields());
  const previewBody = buildPostContent(previewLlm, item.raw_url);
  const previewExcerpt = excerptFromKnowledgeKo({
    summary: fields().ko_summary,
    editorial_note: fields().ko_editorial_note || undefined,
  });
  const previewErr = validateKnowledgePublish(fields().ko_summary, fields().ko_editorial_note);

  function confirmAndReprocess() {
    if (
      !window.confirm(
        '이 초안을 삭제한 뒤, 원문 URL에서 본문을 다시 가져와 LLM으로 처음부터 다시 만듭니다. 편집 중이던 내용은 사라집니다. 계속할까요?',
      )
    ) {
      return;
    }
    onReprocessLlm();
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

      {stubLike ? (
        <div
          style={{
            marginBottom: 14,
            padding: 14,
            background: '#fff7ed',
            border: '2px solid #fb923c',
            borderRadius: 10,
          }}
        >
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#9a3412' }}>
            LLM 가공 전(자동 스텁) — 여기서 한 번에 다시 돌리세요
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#c2410c', lineHeight: 1.55 }}>
            아래 버튼은 카드 맨 아래에도 같은 동작으로 있습니다. 출처 URL에서 본문을 다시 가져온 뒤 Gemini 등으로 한·태 초안을
            채웁니다. (배포 환경에 <code>GEMINI_API_KEY</code> 등 필요)
          </p>
          <button
            type="button"
            disabled={busy || reprocessBusy}
            onClick={() => confirmAndReprocess()}
            style={{
              display: 'inline-block',
              padding: '12px 18px',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: busy || reprocessBusy ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 800,
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            {reprocessBusy ? '재가공 중…' : '원문 다시 불러와 LLM 재가공'}
          </button>
        </div>
      ) : null}

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
        태자 편집팀·이용자 안내 <span style={{ fontWeight: 400, color: '#6b7280' }}>(선택, 스텁 요약일 때 권장)</span>
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

      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        style={{ fontSize: 12, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
      >
        {showPreview ? '▲ 이용자에게 보이는 본문·발췌 미리보기 접기' : '▼ 이용자에게 보이는 본문·발췌 미리보기'}
      </button>
      {showPreview ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            fontSize: 12,
            lineHeight: 1.55,
            color: '#134e4a',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>발췌(로그인 전 /tips·목록 훅에 쓰임)</p>
          <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{previewExcerpt || '(비어 있음)'}</p>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>광장 글 본문(로그인 후 동일)</p>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 220,
              overflow: 'auto',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            {previewBody}
          </pre>
          {previewErr ? (
            <p style={{ margin: '10px 0 0', color: '#b45309', fontWeight: 600 }}>승인 불가: {previewErr}</p>
          ) : (
            <p style={{ margin: '10px 0 0', color: '#059669', fontWeight: 600 }}>현재 필드 기준 승인 검증 통과</p>
          )}
        </div>
      ) : null}

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
          onClick={() => confirmAndReprocess()}
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
