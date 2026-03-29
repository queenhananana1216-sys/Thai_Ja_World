'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const [ensureBusyRawId, setEnsureBusyRawId] = useState<string | null>(null);
  const [ensureBulkBusy, setEnsureBulkBusy] = useState(false);
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

  return (
    <div style={{ marginTop: 12 }}>
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
              <DraftCard key={it.id} item={it} busy={busyId === it.id} onSubmit={submit} />
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
  onSubmit,
}: {
  item: QueueItem;
  busy: boolean;
  onSubmit: (
    id: string,
    action: 'publish' | 'draft' | 'delete',
    fields: Pick<QueueItem, 'ko_title' | 'ko_summary' | 'th_title' | 'th_summary'>,
  ) => Promise<void>;
}) {
  const [koTitle, setKoTitle] = useState(item.ko_title);
  const [koSummary, setKoSummary] = useState(item.ko_summary);
  const [thTitle, setThTitle] = useState(item.th_title);
  const [thSummary, setThSummary] = useState(item.th_summary);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
        background: '#fafafa',
      }}
    >
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(item.id, 'publish', { ko_title: koTitle, ko_summary: koSummary, th_title: thTitle, th_summary: thSummary })}
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
