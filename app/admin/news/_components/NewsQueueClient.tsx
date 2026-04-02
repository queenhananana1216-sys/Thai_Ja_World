'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mergeBilingualCleanBody } from '@/lib/news/mergeCleanBody';
import { newsDetailFromProcessed } from '@/lib/news/processedNewsDisplay';
import { validateNewsPublishFields } from '@/lib/news/validateNewsPublish';
import { isNewsStubKoSummary } from '@/lib/news/newsStubConstants';

/** LLM 일괄 재가공 시 API 과부하를 막기 위한 건당 대기 시간 */
const BATCH_REPROCESS_DELAY_MS = 400;

export type QueueItem = {
  id: string;
  created_at: string;
  week_label: string;
  raw_title: string;
  raw_url: string;
  ko_title: string;
  ko_summary: string;
  th_title: string;
  th_summary: string;
  clean_body: string | null;
  summaries: { summary_text: string; model: string | null }[] | null;
};

export type NewsQueueDiagnostics = {
  draftCount: number;
  publishedCount: number;
  rawNewsRecentCount: number;
  newsModeAuto: boolean;
};

/** processed_news 가 아직 없는 raw_news (서버에서 최근 순 일부만 전달) */
export type OrphanRawNewsItem = {
  id: string;
  title: string;
  external_url: string | null;
  fetched_at: string;
};

export default function NewsQueueClient({
  items,
  diagnostics,
  orphanRawNews = [],
}: {
  items: QueueItem[];
  diagnostics?: NewsQueueDiagnostics | null;
  orphanRawNews?: OrphanRawNewsItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [publishBulkBusy, setPublishBulkBusy] = useState(false);
  const [ensureBusyRawId, setEnsureBusyRawId] = useState<string | null>(null);
  const [ensureBulkBusy, setEnsureBulkBusy] = useState(false);
  const [reprocessBusyId, setReprocessBusyId] = useState<string | null>(null);
  const [bulkLlmBusy, setBulkLlmBusy] = useState(false);
  const [bulkLlmProgress, setBulkLlmProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<QueueItem, 'ko_title' | 'ko_summary' | 'th_title' | 'th_summary'>,
  ) {
    setMsg(null);
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/news-queue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_news_id: id,
          action,
          ...(action === 'delete'
            ? {}
            : {
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
        setMsg('삭제했습니다. (수집 원문·요약·댓글까지 DB에서 제거됩니다)');
      } else {
        setMsg(action === 'publish' ? '게시했습니다.' : '초안 저장했습니다.');
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function unpublishRecentForQueue() {
    const n = Math.min(20, Math.max(1, diagnostics?.publishedCount ?? 0));
    if (
      !window.confirm(
        `최근 공개 중인 뉴스 ${n}건을 «승인 대기»(published=false)로 되돌릴까요?\n` +
          '홈·뉴스에서는 잠시 안 보이다가, 여기서 다시 «홈에 게시»를 누르면 올라갑니다.',
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/news-unpublish-recent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: n }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; updated?: number; message?: string };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(
        j.updated === 0
          ? (j.message ?? '옮길 공개 기사가 없습니다.')
          : `승인 대기로 ${j.updated}건 옮겼습니다. 목록을 새로고침합니다.`,
      );
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function ensureDraftForRaw(rawNewsId: string) {
    setMsg(null);
    setEnsureBusyRawId(rawNewsId);
    try {
      const res = await fetch('/api/admin/news-ensure-draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_news_id: rawNewsId }),
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

  async function ensureDraftBulk() {
    const n = Math.min(20, Math.max(1, orphanRawNews.length || 15));
    if (
      !window.confirm(
        `DB에서 최근 순으로 processed 없는 원문 최대 ${n}건에 스텁 초안을 만들까요?\n` +
          '(이미 초안이 생긴 건 건너뜁니다.)',
      )
    ) {
      return;
    }
    setEnsureBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/news-ensure-draft', {
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

  async function reprocessWithLlm(processedNewsId: string) {
    setMsg(null);
    setReprocessBusyId(processedNewsId);
    try {
      const res = await fetch('/api/admin/news-reprocess-stub', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processed_news_id: processedNewsId }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg('LLM 재가공 완료. 한·태 제목·요약을 확인한 뒤 게시하세요.');
      router.refresh();
    } finally {
      setReprocessBusyId(null);
    }
  }

  async function reprocessAllStubsWithLlm() {
    const targets = items.filter((it) => isNewsStubKoSummary(it.ko_summary));
    if (targets.length === 0) {
      setMsg('LLM 미가공으로 보이는 초안이 없습니다.');
      return;
    }
    if (
      !window.confirm(
        `스텁·발췌 초안 ${targets.length}건을 순서대로 LLM 재가공합니다.\n` +
          '건당 수십 초~1분 이상 걸릴 수 있으며, 전체는 수 분 이상 걸릴 수 있습니다.\n' +
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
    let idx = 0;
    for (const it of targets) {
      idx += 1;
      setBulkLlmProgress(
        `${idx}/${targets.length} — ${it.ko_title.slice(0, 36)}${it.ko_title.length > 36 ? '…' : ''}`,
      );
      try {
        const res = await fetch('/api/admin/news-reprocess-stub', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processed_news_id: it.id }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          fail += 1;
          if (failSamples.length < 5) {
            failSamples.push(
              `${it.ko_title.slice(0, 28) || it.id.slice(0, 8)}: ${j.error ?? String(res.status)}`,
            );
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
      await new Promise((r) => setTimeout(r, BATCH_REPROCESS_DELAY_MS));
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

  async function publishAllDrafts() {
    const n = Math.min(120, Math.max(1, items.length));
    if (
      !window.confirm(
        `현재 승인 대기 뉴스 ${n}건을 한 번에 홈 공개로 올릴까요?\n` +
          '한국어 제목 2자 이상·요약 20자 이상인 초안만 올라가고, 짧은 스텁은 자동으로 건너뜁니다.',
      )
    ) {
      return;
    }
    setPublishBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/news-queue-bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: n }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        updated?: number;
        skipped?: number;
        skipped_samples?: { id: string; reason: string }[];
        message?: string;
      };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      const skipHint =
        j.skipped && j.skipped > 0
          ? ` · 기준 미달로 건너뜀 ${j.skipped}건` +
            (j.skipped_samples?.length
              ? ` (예: ${j.skipped_samples.map((s) => s.reason.slice(0, 40)).join(' / ')})`
              : '')
          : '';
      setMsg(
        j.updated && j.updated > 0
          ? `일괄 게시 완료: ${j.updated}건${skipHint}`
          : (j.message ?? '게시할 초안이 없습니다.') + skipHint,
      );
      router.refresh();
    } finally {
      setPublishBulkBusy(false);
    }
  }

  const orphanPanel =
    orphanRawNews.length > 0 ? (
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
          원문만 있는 기사 (processed_news 없음) — {orphanRawNews.length}건 표시
        </strong>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
          스텁 초안은 원문 발췌·고정 문구로 채워집니다. «승인 큐에 올리기» 후 아래처럼 편집하고 «홈에 게시»하면 됩니다.
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
            : `고아 원문 최대 ${Math.min(20, Math.max(orphanRawNews.length, 1))}건 한 번에 큐에 올리기`}
        </button>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#451a03', lineHeight: 1.6 }}>
          {orphanRawNews.map((o) => (
            <li key={o.id} style={{ marginBottom: 8 }}>
              <a
                href={o.external_url?.trim() ? o.external_url : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#b45309' }}
              >
                {o.title.slice(0, 72)}
                {o.title.length > 72 ? '…' : ''}
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
        {orphanPanel}
        <p style={{ color: '#6b7280', margin: '0 0 12px' }}>
          대기 중인 초안이 없습니다. 봇이 <code>processed_news</code>를 만들고 <code>published=false</code>로 넣으면
          여기에 보입니다. 위 노란 칸에서 원문만 있는 기사를 큐에 올리거나, 크론/LLM으로 요약 단계를 돌릴 수 있어요.
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
            <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
              <li>
                승인 대기 초안: <strong>{diagnostics.draftCount}</strong>건
              </li>
              <li>
                이미 공개(processed): <strong>{diagnostics.publishedCount}</strong>건
              </li>
              <li>
                최근 14일 수집 원문(raw_news): <strong>{diagnostics.rawNewsRecentCount}</strong>건
              </li>
              <li>
                배포 뉴스 모드:{' '}
                <strong>{diagnostics.newsModeAuto ? 'auto (저장 시 곧바로 공개 경향)' : 'manual/기본 (초안 큐)'}</strong>
              </li>
            </ul>
            {diagnostics.publishedCount > 0 ? (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => void unpublishRecentForQueue()}
                style={{
                  padding: '10px 14px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: bulkBusy ? 'wait' : 'pointer',
                }}
              >
                {bulkBusy ? '처리 중…' : `최근 공개 ${Math.min(20, diagnostics.publishedCount)}건 → 승인 대기로 옮기기`}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                공개된 processed_news 가 없으면, 위 버튼 대신 봇 파이프라인으로 새 요약을 만들어야 합니다.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  const byWeek = new Map<string, QueueItem[]>();
  for (const it of items) {
    const list = byWeek.get(it.week_label) ?? [];
    list.push(it);
    byWeek.set(it.week_label, list);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const stubCount = items.filter((it) => isNewsStubKoSummary(it.ko_summary)).length;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          disabled={publishBulkBusy || items.length === 0}
          onClick={() => void publishAllDrafts()}
          style={{
            padding: '10px 14px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: publishBulkBusy ? 'wait' : 'pointer',
            opacity: items.length === 0 ? 0.6 : 1,
          }}
        >
          {publishBulkBusy ? '처리 중…' : `승인 대기 뉴스 일괄 게시 (${items.length}건)`}
        </button>
        {stubCount > 0 && (
          <button
            type="button"
            disabled={bulkLlmBusy}
            onClick={() => void reprocessAllStubsWithLlm()}
            style={{
              padding: '10px 14px',
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: bulkLlmBusy ? 'wait' : 'pointer',
            }}
          >
            {bulkLlmBusy
              ? `LLM 재가공 중… ${bulkLlmProgress ?? ''}`
              : `스텁 ${stubCount}건 LLM 재가공`}
          </button>
        )}
      </div>
      {orphanPanel}
      {msg ? (
        <p style={{ color: '#059669', fontSize: 13, marginBottom: 12 }}>{msg}</p>
      ) : null}
      {weeks.map((wk) => (
        <section key={wk} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px', fontWeight: 700 }}>
            주간 묶음 · {wk}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byWeek.get(wk)!.map((it) => (
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
      ))}
    </div>
  );
}

function DraftCard({
  item,
  busy,
  reprocessBusy,
  onSubmit,
  onReprocessLlm,
}: {
  item: QueueItem;
  busy: boolean;
  reprocessBusy: boolean;
  onSubmit: (
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<QueueItem, 'ko_title' | 'ko_summary' | 'th_title' | 'th_summary'>,
  ) => Promise<void>;
  onReprocessLlm: () => void;
}) {
  const [koTitle, setKoTitle] = useState(item.ko_title);
  const [koSummary, setKoSummary] = useState(item.ko_summary);
  const [thTitle, setThTitle] = useState(item.th_title);
  const [thSummary, setThSummary] = useState(item.th_summary);
  const [showPreview, setShowPreview] = useState(true);

  const mergedJson = mergeBilingualCleanBody(item.clean_body, {
    ko_title: koTitle,
    ko_summary: koSummary,
    th_title: thTitle,
    th_summary: thSummary,
  });
  const userView = newsDetailFromProcessed(mergedJson, item.raw_title, item.raw_url, item.summaries, 'ko');
  const publishErr = validateNewsPublishFields(koTitle, koSummary);
  const isStub = isNewsStubKoSummary(item.ko_summary);

  return (
    <div
      style={{
        border: `1px solid ${isStub ? '#fcd34d' : '#e5e7eb'}`,
        borderRadius: 10,
        padding: 14,
        background: isStub ? '#fffbeb' : '#fafafa',
      }}
    >
      {isStub && (
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 12,
            color: '#92400e',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          ⚠️ <strong>LLM 미가공 초안</strong> — 아직 번역·요약·편집실 한마디가 만들어지지 않았습니다. «LLM 재가공»
          버튼으로 다시 처리하거나 직접 편집 후 게시하세요.
        </p>
      )}
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
        원문 ·{' '}
        <a href={item.raw_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
          {item.raw_title.slice(0, 80)}
          {item.raw_title.length > 80 ? '…' : ''}
        </a>
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9ca3af' }}>
        초안 id: {item.id} · {new Date(item.created_at).toLocaleString('ko-KR')}
      </p>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>한국어 제목</label>
      <input
        value={koTitle}
        onChange={(e) => setKoTitle(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13 }}
      />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>한국어 요약</label>
      <textarea
        value={koSummary}
        onChange={(e) => setKoSummary(e.target.value)}
        rows={4}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13 }}
      />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ไทย หัวข้อ</label>
      <input
        value={thTitle}
        onChange={(e) => setThTitle(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8, fontSize: 13 }}
      />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ไทย สรุป</label>
      <textarea
        value={thSummary}
        onChange={(e) => setThSummary(e.target.value)}
        rows={4}
        style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 13 }}
      />

      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        style={{ fontSize: 12, color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
      >
        {showPreview ? '▲ 이용자 홈·뉴스에 보이는 형태 미리보기 접기' : '▼ 이용자 홈·뉴스에 보이는 형태 미리보기'}
      </button>
      {showPreview ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            fontSize: 12,
            lineHeight: 1.55,
            color: '#0c4a6e',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>제목</p>
          <p style={{ margin: '0 0 10px' }}>{userView.title}</p>
          {userView.blurb ? (
            <>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>짧은 훅(blurb)</p>
              <p style={{ margin: '0 0 10px' }}>{userView.blurb}</p>
            </>
          ) : null}
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>요약 본문</p>
          <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{userView.summary ?? '(없음)'}</p>
          {userView.editorNote ? (
            <>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>편집 노트</p>
              <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{userView.editorNote}</p>
            </>
          ) : null}
          {publishErr ? (
            <p style={{ margin: 0, color: '#b45309', fontWeight: 600 }}>승인 불가: {publishErr}</p>
          ) : (
            <p style={{ margin: 0, color: '#059669', fontWeight: 600 }}>현재 필드 기준 승인 검증 통과</p>
          )}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {isStub && (
          <button
            type="button"
            disabled={busy || reprocessBusy}
            onClick={onReprocessLlm}
            style={{
              padding: '8px 14px',
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: busy || reprocessBusy ? 'wait' : 'pointer',
            }}
          >
            {reprocessBusy ? 'LLM 재가공 중…' : 'LLM 재가공'}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const err = validateNewsPublishFields(koTitle, koSummary);
            if (err) {
              window.alert(err);
              return;
            }
            void onSubmit(item.id, 'publish', {
              ko_title: koTitle,
              ko_summary: koSummary,
              th_title: thTitle,
              th_summary: thSummary,
            });
          }}
          style={{
            padding: '8px 14px',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          홈에 게시
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(item.id, 'draft', { ko_title: koTitle, ko_summary: koSummary, th_title: thTitle, th_summary: thSummary })}
          style={{
            padding: '8px 14px',
            background: '#e5e7eb',
            color: '#374151',
            border: 'none',
            borderRadius: 6,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          초안만 저장
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                '이 기사를 완전히 삭제할까요?\n수집된 원문(raw_news)·요약·댓글이 DB에서 지워지며, 같은 피드가 다시 들어오면 새로 수집될 수 있습니다.',
              )
            ) {
              return;
            }
            void onSubmit(item.id, 'delete', {
              ko_title: koTitle,
              ko_summary: koSummary,
              th_title: thTitle,
              th_summary: thSummary,
            });
          }}
          style={{
            padding: '8px 14px',
            marginLeft: 'auto',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 6,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          삭제(올리지 않음)
        </button>
      </div>
    </div>
  );
}
