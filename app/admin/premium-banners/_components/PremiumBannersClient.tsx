'use client';

import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';

export type PremiumBannerRow = {
  id: string;
  slot: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
  badge_text: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  extra: unknown;
};

function extraToString(extra: unknown): string {
  if (!extra || typeof extra !== 'object') return '';
  try {
    return JSON.stringify(extra, null, 2);
  } catch {
    return '';
  }
}

const btnPrimary: CSSProperties = {
  padding: '10px 14px',
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  padding: '10px 14px',
  background: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const fieldStyle: CSSProperties = { display: 'block', marginBottom: 14 };
const labelSpan: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' };

const SLOTS = [
  { v: 'top_bar', l: '상단 바 (네비 아래)' },
  { v: 'home_strip', l: '홈 스트립' },
  { v: 'sidebar', l: '사이드바' },
] as const;

type FormState = {
  mode: 'new' | 'edit';
  id: string;
  slot: string;
  title: string;
  subtitle: string;
  image_url: string;
  href: string;
  badge_text: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  extra_json: string;
};

function rowToForm(row: PremiumBannerRow): FormState {
  return {
    mode: 'edit',
    id: row.id,
    slot: row.slot,
    title: row.title,
    subtitle: row.subtitle ?? '',
    image_url: row.image_url ?? '',
    href: row.href ?? '',
    badge_text: row.badge_text ?? '',
    sort_order: row.sort_order,
    is_active: row.is_active,
    starts_at: row.starts_at ? row.starts_at.slice(0, 16) : '',
    ends_at: row.ends_at ? row.ends_at.slice(0, 16) : '',
    extra_json: extraToString(row.extra),
  };
}

const emptyForm: FormState = {
  mode: 'new',
  id: '',
  slot: 'top_bar',
  title: '',
  subtitle: '',
  image_url: '',
  href: '',
  badge_text: '',
  sort_order: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
  extra_json: '',
};

export default function PremiumBannersClient({ rows }: { rows: PremiumBannerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  async function postJson(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/premium-banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  function toIsoOrNull(s: string, label: string): string | null {
    const t = s.trim();
    if (!t) return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) throw new Error(`${label} 날짜가 올바르지 않습니다.`);
    return d.toISOString();
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        slot: form.slot,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image_url: form.image_url.trim() || null,
        href: form.href.trim() || null,
        badge_text: form.badge_text.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
        starts_at: toIsoOrNull(form.starts_at, '시작'),
        ends_at: toIsoOrNull(form.ends_at, '종료'),
        extra_json: form.extra_json.trim() || null,
      };

      if (form.mode === 'new') {
        await postJson({ action: 'create', ...payload });
        setMsg('등록했습니다.');
      } else {
        await postJson({ action: 'update', id: form.id, ...payload });
        setMsg('저장했습니다.');
      }
      setForm(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!form || form.mode !== 'edit') return;
    if (!confirm('삭제할까요?')) return;
    setBusy(true);
    setMsg(null);
    try {
      await postJson({ action: 'delete', id: form.id });
      setForm(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          style={{ ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
          onClick={() => {
            setMsg(null);
            setForm({ ...emptyForm });
          }}
        >
          새 배너
        </button>
        {msg && <span style={{ fontSize: 14, color: msg.includes('습니다') ? '#059669' : '#dc2626' }}>{msg}</span>}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((r) => (
          <li
            key={r.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div>
              <strong>{r.title || '(제목 없음)'}</strong>{' '}
              <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px' }}>{r.slot}</code>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                정렬 {r.sort_order} · {r.is_active ? '활성' : '비활성'}
                {r.starts_at ? ` · 시작 ${r.starts_at.slice(0, 10)}` : ''}
                {r.ends_at ? ` · 종료 ${r.ends_at.slice(0, 10)}` : ''}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              style={{ ...btnGhost, fontSize: 12, padding: '8px 12px' }}
              onClick={() => {
                setMsg(null);
                setForm(rowToForm(r));
              }}
            >
              수정
            </button>
          </li>
        ))}
      </ul>

      {rows.length === 0 && <p style={{ color: '#64748b' }}>등록된 배너가 없습니다.</p>}

      {form && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 80,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            overflow: 'auto',
          }}
          role="presentation"
          onClick={() => !busy && setForm(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              padding: 20,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
            }}
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>{form.mode === 'new' ? '새 배너' : '배너 수정'}</h2>

            <label style={fieldStyle}>
              <span style={labelSpan}>슬롯</span>
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                {SLOTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>제목 *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>부제</span>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>이미지 URL</span>
              <input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>링크 (href)</span>
              <input
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>뱃지 텍스트</span>
              <input
                value={form.badge_text}
                onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>정렬 (작을수록 앞)</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>활성 (비활성 시 공개 조회에서 제외)</span>
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>시작 (로컬 datetime — 비우면 즉시)</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>종료 (비우면 무기한)</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>확장 JSON</span>
              <textarea
                value={form.extra_json}
                onChange={(e) => setForm({ ...form, extra_json: e.target.value })}
                rows={3}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={busy}
                style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}
                onClick={() => void onSave()}
              >
                저장
              </button>
              <button type="button" disabled={busy} style={btnGhost} onClick={() => setForm(null)}>
                닫기
              </button>
              {form.mode === 'edit' && (
                <button
                  type="button"
                  disabled={busy}
                  style={{ ...btnGhost, borderColor: '#fca5a5', color: '#b91c1c' }}
                  onClick={() => void onDelete()}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
