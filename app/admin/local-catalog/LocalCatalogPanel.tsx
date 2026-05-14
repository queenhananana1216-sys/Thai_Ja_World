'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeThailandPhoneForTelHref } from '@/lib/korean-biz/publicContact';

type Row = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  phone: string | null;
  address: string | null;
  map_url: string | null;
  is_active: boolean;
  updated_at: string;
};

export default function LocalCatalogPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMapUrl, setEditMapUrl] = useState('');

  const form = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/localbizcatalog', { cache: 'no-store' });
      if (!res.ok) {
        setMsg(res.status === 403 ? 'Forbidden (admin only).' : 'Failed to load list.');
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows?: Row[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setMsg('Failed to load list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!form) return;
    setEditPhone(form.phone ?? '');
    setEditAddress(form.address ?? '');
    setEditMapUrl(form.map_url ?? '');
  }, [form]);

  const telHref = normalizeThailandPhoneForTelHref(editPhone);

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/localbizcatalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          map_url: editMapUrl.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(j.error ?? 'Save failed');
        return;
      }
      setMsg('Saved.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13 }}>
        <Link href="/admin/publish" style={{ color: '#4f46e5' }}>
          Publish hub
        </Link>
      </p>
      <h1 style={{ fontSize: 20, margin: '0 0 8px', fontWeight: 800 }}>Local businesses (quick edit)</h1>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
        Edit phone (+66), address, and Google Maps HTTPS URL for <code>local_businesses</code>.
      </p>
      {msg ? <p style={{ margin: '0 0 12px', fontSize: 13, color: '#059669' }}>{msg}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)', gap: 16 }}>
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            maxHeight: 520,
            overflow: 'auto',
            background: '#fff',
          }}
        >
          {loading ? (
            <p style={{ padding: 16, margin: 0, color: '#64748b' }}>Loading</p>
          ) : rows.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: '#64748b' }}>No rows.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: selectedId === r.id ? '#eef2ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <strong style={{ display: 'block' }}>{r.name}</strong>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {r.category} / {r.region} / {r.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: 16,
            background: '#f8fafc',
          }}
        >
          {!form ? (
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Pick a row on the left.</p>
          ) : (
            <>
              <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{form.name}</h2>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Phone</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+66812345678"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  marginBottom: 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              />
              {telHref ? (
                <p style={{ margin: '0 0 10px', fontSize: 12 }}>
                  <a href={telHref} style={{ color: '#2563eb' }}>
                    tel: link
                  </a>
                </p>
              ) : null}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Address</label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  marginBottom: 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  resize: 'vertical',
                }}
              />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Google Maps URL (https)
              </label>
              <input
                value={editMapUrl}
                onChange={(e) => setEditMapUrl(e.target.value)}
                placeholder="https://www.google.com/maps?q=..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  marginBottom: 10,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
              {editMapUrl.trim() ? (
                <p style={{ margin: '0 0 12px', fontSize: 12 }}>
                  <a href={editMapUrl.trim()} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                    Open map
                  </a>
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#4f46e5',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? 'Saving' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
