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

export default function NewsQueueClient({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(
    id: string,
    action: 'publish' | 'draft',
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
          ko_title: fields.ko_title,
          ko_summary: fields.ko_summary,
          th_title: fields.th_title,
          th_summary: fields.th_summary,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? `오류 (${res.status})`);
        return;
      }
      setMsg(action === 'publish' ? '게시했습니다.' : '초안 저장했습니다.');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p style={{ color: '#6b7280', marginTop: 16 }}>
        대기 중인 초안이 없습니다. <code>NEWS_PUBLISH_MODE=manual</code> 이고 LLM 처리가 되면 여기에 쌓입니다.
      </p>
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
    action: 'publish' | 'draft',
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
      </div>
    </div>
  );
}
