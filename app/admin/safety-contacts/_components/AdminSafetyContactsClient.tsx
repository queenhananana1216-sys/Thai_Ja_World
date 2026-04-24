'use client';

import { useCallback, useState } from 'react';

const KINDS = [
  { v: 'embassy', l: 'embassy' },
  { v: 'police', l: 'police' },
  { v: 'medical', l: 'medical' },
  { v: 'tourist_police', l: 'tourist_police' },
  { v: 'korean_24h', l: 'korean_24h' },
  { v: 'report', l: 'report' },
  { v: 'other', l: 'other' },
] as const;

const V_KINDS = [
  { v: 'phone', l: 'phone' },
  { v: 'url', l: 'url' },
  { v: 'text', l: 'text' },
] as const;

export type SafetyRow = {
  id: string;
  kind: string;
  label_ko: string;
  label_th: string;
  value: string;
  value_kind: string;
  source_url: string | null;
  source_note: string | null;
  href: string | null;
  display_order: number;
  is_active: boolean;
  updated_at: string;
};

type Draft = {
  kind: string;
  label_ko: string;
  label_th: string;
  value: string;
  value_kind: string;
  source_url: string;
  source_note: string;
  href: string;
  display_order: number;
  is_active: boolean;
};

const emptyDraft = (): Draft => ({
  kind: 'other',
  label_ko: '',
  label_th: '',
  value: '',
  value_kind: 'text',
  source_url: '',
  source_note: '',
  href: '',
  display_order: 0,
  is_active: true,
});

function fromRow(r: SafetyRow): Draft {
  return {
    kind: r.kind,
    label_ko: r.label_ko,
    label_th: r.label_th,
    value: r.value,
    value_kind: r.value_kind,
    source_url: r.source_url ?? '',
    source_note: r.source_note ?? '',
    href: r.href ?? '',
    display_order: r.display_order,
    is_active: r.is_active,
  };
}

function draftToApi(d: Draft) {
  return {
    kind: d.kind,
    label_ko: d.label_ko,
    label_th: d.label_th,
    value: d.value,
    value_kind: d.value_kind,
    source_url: d.source_url.trim() || null,
    source_note: d.source_note.trim() || null,
    href: d.href.trim() || null,
    display_order: d.display_order,
    is_active: d.is_active,
  };
}

type Props = { initialRows: SafetyRow[] };

export function AdminSafetyContactsClient({ initialRows }: Props) {
  const [rows, setRows] = useState<SafetyRow[]>(initialRows);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const load = useCallback(async () => {
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/safety-contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const j = (await res.json()) as { rows?: SafetyRow[]; error?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      setRows(j.rows ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, []);

  async function onDelete(id: string) {
    if (!window.confirm('삭제할까요?')) return;
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/safety-contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      setRows((r) => r.filter((x) => x.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setIsCreate(false);
        setDraft(emptyDraft());
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setErr(null);
    setSaving(true);
    const body = {
      action: (isCreate ? 'create' : 'update') as 'create' | 'update',
      id: isCreate ? undefined : editingId ?? undefined,
      ...draftToApi(draft),
    };
    try {
      const res = await fetch('/api/admin/safety-contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      await load();
      setIsCreate(false);
      setEditingId(null);
      setDraft(emptyDraft());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {err ? <p className="admin-form-error">{err}</p> : null}
      {saving && <p style={{ fontSize: 12, color: '#64748b' }}>처리 중…</p>}

      <p style={{ margin: '0 0 8px' }}>
        <button
          type="button"
          onClick={() => {
            setIsCreate(true);
            setEditingId(null);
            setDraft(emptyDraft());
          }}
          className="admin-cta"
        >
          새 항목
        </button>
      </p>

      {(isCreate || editingId) && (
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h2 className="admin-form__h">{isCreate ? '새 항목' : '수정'}</h2>
          <div className="admin-form__row">
            <label>kind</label>
            <select
              value={draft.kind}
              onChange={(ev) => setDraft((d) => ({ ...d, kind: ev.target.value }))}
            >
              {KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.l}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form__row">
            <label>label_ko</label>
            <input
              value={draft.label_ko}
              onChange={(e) => setDraft((d) => ({ ...d, label_ko: e.target.value }))}
              className="admin-form__input"
            />
          </div>
          <div className="admin-form__row">
            <label>label_th</label>
            <input
              value={draft.label_th}
              onChange={(e) => setDraft((d) => ({ ...d, label_th: e.target.value }))}
              className="admin-form__input"
            />
          </div>
          <div className="admin-form__row">
            <label>value</label>
            <input
              value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              className="admin-form__input"
            />
          </div>
          <div className="admin-form__row">
            <label>value_kind</label>
            <select
              value={draft.value_kind}
              onChange={(e) => setDraft((d) => ({ ...d, value_kind: e.target.value }))}
            >
              {V_KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.l}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form__row">
            <label>source_url (선택)</label>
            <input
              value={draft.source_url}
              onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))}
              className="admin-form__input"
            />
          </div>
          <div className="admin-form__row">
            <label>source_note (선택)</label>
            <textarea
              value={draft.source_note}
              onChange={(e) => setDraft((d) => ({ ...d, source_note: e.target.value }))}
              className="admin-form__input"
              rows={3}
            />
          </div>
          <div className="admin-form__row">
            <label>href (선택, 링크)</label>
            <input
              value={draft.href}
              onChange={(e) => setDraft((d) => ({ ...d, href: e.target.value }))}
              className="admin-form__input"
            />
          </div>
          <div className="admin-form__row">
            <label>display_order</label>
            <input
              type="number"
              value={draft.display_order}
              onChange={(e) =>
                setDraft((d) => ({ ...d, display_order: Math.floor(Number(e.target.value) || 0) }))
              }
            />
          </div>
          <div className="admin-form__row">
            <label>is_active</label>
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
          </div>
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="admin-cta">
              {isCreate ? '저장' : '수정 반영'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreate(false);
                setEditingId(null);
                setDraft(emptyDraft());
              }}
            >
              취소
            </button>
          </p>
        </form>
      )}

      <table
        className="admin-table"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 20 }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>order</th>
            <th>kind</th>
            <th>ko</th>
            <th>th</th>
            <th>value</th>
            <th>v_kind</th>
            <th>on</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.display_order}</td>
              <td>
                <code>{r.kind}</code>
              </td>
              <td style={{ maxWidth: 160 }}>{r.label_ko}</td>
              <td style={{ maxWidth: 160 }}>{r.label_th}</td>
              <td>
                <code style={{ fontSize: 10 }}>{r.value}</code>
              </td>
              <td>{r.value_kind}</td>
              <td>{r.is_active ? 'O' : 'X'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreate(false);
                    setEditingId(r.id);
                    setDraft(fromRow(r));
                  }}
                >
                  편집
                </button>{' '}
                <button type="button" onClick={() => void onDelete(r.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
