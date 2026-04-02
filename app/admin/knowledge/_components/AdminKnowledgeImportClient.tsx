'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type CSSProperties } from 'react';

type BoardTarget = 'tips_board' | 'board_board';

type DraftRow = {
  key: string;
  external_url: string;
  title_original: string;
  board_target: BoardTarget;
  ko_title: string;
  ko_summary: string;
  ko_editorial: string;
  th_title: string;
  th_summary: string;
};

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyRow(): DraftRow {
  return {
    key: newKey(),
    external_url: '',
    title_original: '',
    board_target: 'tips_board',
    ko_title: '',
    ko_summary: '',
    ko_editorial: '',
    th_title: '',
    th_summary: '',
  };
}

/**
 * 제미나이·편집팀 초안 → 승인 큐 (간편 폼 또는 JSON).
 * 서버로 보낼 때만 JSON으로 변환됩니다. 운영자는 칸만 채우면 됩니다.
 */
export default function AdminKnowledgeImportClient() {
  const router = useRouter();
  const [mode, setMode] = useState<'easy' | 'json'>('easy');
  const [rows, setRows] = useState<DraftRow[]>(() => [emptyRow()]);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const postItems = useCallback(
    async (items: unknown[], extraNote?: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch('/api/admin/knowledge-gemini-import', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          imported?: number;
          failed?: number;
          results?: { index: number; ok: boolean; error?: string }[];
        };
        if (!res.ok) {
          setMsg(j.error ?? `오류 (${res.status})`);
          return;
        }
        const base = `가져오기 완료: 성공 ${j.imported ?? 0}건, 실패 ${j.failed ?? 0}건. 아래 목록을 새로고침했습니다.`;
        setMsg(extraNote ? `${base} ${extraNote}` : base);
        setJson('');
        setRows([emptyRow()]);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  async function submitEasy() {
    const MAX = 40;
    const filled = rows.filter(
      (r) =>
        r.ko_title.trim().length > 0 ||
        r.ko_summary.trim().length > 0 ||
        r.th_title.trim().length > 0 ||
        r.th_summary.trim().length > 0,
    );
    if (filled.length === 0) {
      setMsg('최소 한 줄이라도 제목·요약을 채워 주세요.');
      return;
    }
    const slice = filled.slice(0, MAX);
    const overflowNote =
      filled.length > MAX
        ? `(채운 줄이 ${filled.length}개라 앞에서 ${MAX}건만 반영했어요. 나머지는 한 번 더 제출해 주세요.)`
        : undefined;
    const items = slice.map((r, i) => {
      const url = r.external_url.trim();
      const external_url =
        url ||
        `https://thaijaworld.com/_editor-draft/${newKey()}-${i}`;
      const ko_summary = r.ko_summary.trim();
      const ko_editorial = r.ko_editorial.trim();
      if (!r.ko_title.trim() || !ko_summary) {
        throw new Error(`한국어 제목·요약을 모두 채워 주세요. (#${i + 1})`);
      }
      if (!r.th_title.trim() || !r.th_summary.trim()) {
        throw new Error(`태국어 제목·요약을 모두 채워 주세요. (#${i + 1})`);
      }
      return {
        external_url,
        board_target: r.board_target,
        title_original: r.title_original.trim() || r.ko_title.trim(),
        ko: {
          title: r.ko_title.trim(),
          summary: ko_summary,
          editorial_note: ko_editorial || undefined,
        },
        th: {
          title: r.th_title.trim(),
          summary: r.th_summary.trim(),
        },
      };
    });

    try {
      await postItems(items, overflowNote);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function submitJson() {
    setMsg(null);
    let parsed: { items: unknown[] };
    try {
      parsed = JSON.parse(json.trim()) as { items: unknown[] };
    } catch {
      setMsg('JSON 형식이 잘못됐어요. «간편 입력» 탭을 쓰시면 JSON 없이 됩니다.');
      return;
    }
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      setMsg('items 배열이 필요합니다.');
      return;
    }
    await postItems(parsed.items.slice(0, 40));
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => (prev.length >= 40 ? prev : [...prev, emptyRow()]));
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 8,
    fontSize: 13,
    borderRadius: 6,
    border: '1px solid #bbf7d0',
  };

  return (
    <div
      style={{
        marginBottom: 20,
        padding: 14,
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 10,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#14532d' }}>
        꿀팁·편집 초안 넣기 (한 번에 최대 40건)
      </strong>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#166534', lineHeight: 1.55 }}>
        <strong>JSON을 몰라도 됩니다.</strong> 아래 칸만 채우면 돼요. 제미나이에서 나온 글을 복사해 붙여 넣어도 되고, 출처 URL이 없으면
        비워 두세요 — 시스템이 임시 주소를 붙입니다. 넣은 뒤 아래 목록에서 <strong>「꿀팁 일괄 승인»</strong>만 누르면 사이트에
        올라갑니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMode('easy')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: mode === 'easy' ? '2px solid #16a34a' : '1px solid #86efac',
            background: mode === 'easy' ? '#dcfce7' : '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          간편 입력 (추천)
        </button>
        <button
          type="button"
          onClick={() => setMode('json')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: mode === 'json' ? '2px solid #16a34a' : '1px solid #86efac',
            background: mode === 'json' ? '#dcfce7' : '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          JSON 붙여넣기 (고급)
        </button>
      </div>

      {mode === 'easy' ? (
        <>
          {rows.map((r, idx) => (
            <div
              key={r.key}
              style={{
                marginBottom: 14,
                padding: 12,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#14532d' }}>#{idx + 1}</span>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    style={{ fontSize: 11, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    이 줄 삭제
                  </button>
                ) : null}
              </div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                출처 URL (없으면 비워 두기)
              </label>
              <input
                value={r.external_url}
                onChange={(e) => updateRow(r.key, { external_url: e.target.value })}
                placeholder="https://..."
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                말머리
              </label>
              <select
                value={r.board_target}
                onChange={(e) => updateRow(r.key, { board_target: e.target.value as BoardTarget })}
                style={{ ...inputStyle, marginBottom: 8, maxWidth: 280 }}
              >
                <option value="tips_board">꿀팁 (/tips 허브)</option>
                <option value="board_board">비자·가이드 (광장 정보)</option>
              </select>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                원문 제목 (선택, 비우면 한국어 제목 사용)
              </label>
              <input
                value={r.title_original}
                onChange={(e) => updateRow(r.key, { title_original: e.target.value })}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                한국어 제목
              </label>
              <input
                value={r.ko_title}
                onChange={(e) => updateRow(r.key, { ko_title: e.target.value })}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                한국어 요약 (/tips 짧은 소개에 쓰임)
              </label>
              <textarea
                value={r.ko_summary}
                onChange={(e) => updateRow(r.key, { ko_summary: e.target.value })}
                rows={3}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                편집팀 안내 (선택)
              </label>
              <textarea
                value={r.ko_editorial}
                onChange={(e) => updateRow(r.key, { ko_editorial: e.target.value })}
                rows={2}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                ไทย หัวข้อ
              </label>
              <input
                value={r.th_title}
                onChange={(e) => updateRow(r.key, { th_title: e.target.value })}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#166534' }}>
                ไทย สรุป
              </label>
              <textarea
                value={r.th_summary}
                onChange={(e) => updateRow(r.key, { th_summary: e.target.value })}
                rows={3}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              disabled={busy || rows.length >= 40}
              onClick={() => addRow()}
              style={{
                padding: '8px 14px',
                background: '#fff',
                color: '#166534',
                border: '1px solid #86efac',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: busy || rows.length >= 40 ? 'not-allowed' : 'pointer',
              }}
            >
              + 줄 추가 ({rows.length}/40)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitEasy()}
              style={{
                padding: '10px 18px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? '올리는 중…' : '초안으로 넣기'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#166534' }}>
            개발·자동화용입니다. 일반 운영은 «간편 입력»을 쓰세요.
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={8}
            placeholder='{"items":[{"external_url":"https://...","board_target":"tips_board","ko":{"title":"...","summary":"..."},"th":{"title":"...","summary":"..."}}]}'
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: 10,
              borderRadius: 8,
              border: '1px solid #bbf7d0',
              marginBottom: 10,
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitJson()}
            style={{
              padding: '10px 16px',
              background: '#15803d',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? '업로드 중…' : 'JSON으로 초안 넣기'}
          </button>
        </>
      )}

      {msg ? (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            color: msg.includes('오류') || msg.includes('필요') || msg.includes('잘못') ? '#b45309' : '#15803d',
          }}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
