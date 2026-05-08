'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { KoreanBizCategory } from '@/lib/korean-biz/koreanBizTypes';

type Row = {
  id: string;
  google_place_id: string;
  name: string;
  category: KoreanBizCategory;
  region: 'bangkok' | 'pattaya' | 'chiangmai';
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  line_url?: string | null;
  whatsapp_url?: string | null;
  contact_checked_at?: string | null;
  contact_link_ok?: boolean | null;
  is_verified: boolean;
};

type PrefillDraftApi = {
  google_place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  suggested_region: 'bangkok' | 'pattaya' | 'chiangmai';
  suggested_category: KoreanBizCategory;
  is_verified: boolean;
};

type CreateForm = {
  /** 구글 URL/ID 원문 — [장소 불러오기] 시에만 전송 */
  placeInputRaw: string;
  google_place_id: string;
  name: string;
  address: string;
  phone: string;
  lat: string;
  lng: string;
  category: KoreanBizCategory;
  region: 'bangkok' | 'pattaya' | 'chiangmai';
  line_url: string;
  whatsapp_url: string;
};

const CATEGORIES: { v: KoreanBizCategory; l: string }[] = [
  { v: 'mart', l: '마트·식재료' },
  { v: 'pharmacy', l: '약국' },
  { v: 'hospital', l: '병원·의원' },
  { v: 'vehicle_rent', l: '렌트·바이크' },
  { v: 'golf', l: '골프' },
  { v: 'massage_spa', l: '마사지·스파' },
];

const REGIONS: { v: 'bangkok' | 'pattaya' | 'chiangmai'; l: string }[] = [
  { v: 'bangkok', l: '방콕' },
  { v: 'pattaya', l: '파타야' },
  { v: 'chiangmai', l: '치앙마이' },
];

function emptyCreate(): CreateForm {
  return {
    placeInputRaw: '',
    google_place_id: '',
    name: '',
    address: '',
    phone: '',
    lat: '',
    lng: '',
    category: 'mart',
    region: 'bangkok',
    line_url: '',
    whatsapp_url: '',
  };
}

export default function AdminBizManagementPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [create, setCreate] = useState<CreateForm>(() => emptyCreate());

  const form = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLine, setEditLine] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editCat, setEditCat] = useState<KoreanBizCategory>('mart');
  const [editRegion, setEditRegion] = useState<'bangkok' | 'pattaya' | 'chiangmai'>('bangkok');

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/korean-biz/manage', { cache: 'no-store' });
      if (!res.ok) {
        setMsg(res.status === 403 ? '관리자 권한이 필요합니다.' : '목록 로드 실패');
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows?: Row[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setMsg('목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!form) return;
    setEditName(form.name);
    setEditPhone(form.phone ?? '');
    setEditAddress(form.address ?? '');
    setEditLine(form.line_url ?? '');
    setEditWa(form.whatsapp_url ?? '');
    setEditCat(form.category);
    setEditRegion(form.region);
  }, [form]);

  const patchRow = async () => {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/korean-biz/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          name: editName.trim(),
          address: editAddress.trim() || null,
          phone: editPhone.trim() || null,
          line_url: editLine.trim() || null,
          whatsapp_url: editWa.trim() || null,
          category: editCat,
          region: editRegion,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; probed?: boolean };
      if (!res.ok) {
        window.alert(j.error ?? '저장 실패');
        return;
      }
      setMsg('저장 완료. 연락 채널 프로브 실행 후 상태가 즉시 갱신됩니다.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const fetchPrefill = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/korean-biz/prefill-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeOrUrl: create.placeInputRaw }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        draft?: PrefillDraftApi;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !j.draft) {
        window.alert(j.detail ?? j.error ?? '플레이스 조회 실패');
        return;
      }
      const d = j.draft;
      setCreate((prev) => ({
        ...prev,
        google_place_id: d.google_place_id,
        name: d.name ?? '',
        address: d.address ?? '',
        phone: d.phone ?? '',
        lat:
          typeof d.latitude === 'number' && Number.isFinite(d.latitude) ? String(d.latitude) : '',
        lng:
          typeof d.longitude === 'number' && Number.isFinite(d.longitude)
            ? String(d.longitude)
            : '',
        category: d.suggested_category ?? 'mart',
        region: d.suggested_region,
      }));
      setMsg('플레이스 정보를 신규 등록 폼에 채웠습니다. 수정 후 「신규 등록」 하세요.');
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    const pid = create.google_place_id.trim();
    const nm = create.name.trim();
    if (!pid || !nm) {
      window.alert('Google Place ID(또는 불러오기 후 값)와 업체명은 필수입니다.');
      return;
    }
    const latN = parseFloat(create.lat.trim());
    const lngN = parseFloat(create.lng.trim());
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/korean-biz/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_place_id: pid,
          name: nm,
          category: create.category,
          region: create.region,
          address: create.address.trim() || null,
          phone: create.phone.trim() || null,
          latitude: Number.isFinite(latN) ? latN : null,
          longitude: Number.isFinite(lngN) ? lngN : null,
          line_url: create.line_url.trim() || null,
          whatsapp_url: create.whatsapp_url.trim() || null,
          is_verified: true,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        window.alert(j.error ?? '등록 실패');
        return;
      }
      setMsg('신규 등록 완료. 연락 채널 프로브까지 실행되었습니다.');
      setCreate(emptyCreate());
      await load();
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async () => {
    if (!form) return;
    if (!window.confirm(`${form.name}\n정말 DB에서 삭제할까요? 연관 제안 레코드도 함께 정리될 수 있습니다.`)) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/korean-biz/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(j.error ?? '삭제 실패');
        return;
      }
      setSelectedId(null);
      setMsg('삭제했습니다.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const badgeContact = (r: Row) => {
    if (r.contact_link_ok === true) return { label: '연락 인증됨', fg: '#0f4226', bg: '#bbf7d0' };
    if (r.contact_link_ok === false) return { label: '링크 불량', fg: '#7f1d1d', bg: '#fecaca' };
    return { label: '미검사', fg: '#334155', bg: '#e2e8f0' };
  };

  const fld = { padding: '12px 10px', borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 48 };

  return (
    <div style={{ maxWidth: 1080 }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .tj-biz-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 20px;
            }
            @media (max-width: 860px) {
              .tj-biz-grid { grid-template-columns: minmax(0, 1fr); }
            }
          `,
        }}
      />

      <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 850 }}>
        한인 생활망 · 통합 CRUD
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.88 }}>
        <strong>생성:</strong> 아래 신규 폼에서 저장 시 즉시 DB 반영 후{' '}
        <code style={{ opacity: 0.88 }}>probeAndPersistKoreanBizContacts</code> 실행 —
        「연락 인증됨」 상태가 새로 고쳐집니다.&nbsp;
        <strong>수정·삭제:</strong> 우측에서 선택 후 처리합니다. 장소 줄만 넣어도 주소·전화좌표가 채워집니다.
      </p>

      <section
        style={{
          marginBottom: 28,
          padding: 16,
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          background: '#f8fafc',
          display: 'grid',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 850 }}>신규 업체 통합 패널</h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => setCreate(emptyCreate())}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid #94a3b8',
              background: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            폼 비우기
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>구글 장소 ID / 공유 링크 (프리필용)</span>
            <textarea
              value={create.placeInputRaw}
              onChange={(e) => setCreate({ ...create, placeInputRaw: e.target.value })}
              rows={3}
              placeholder={'Place ID (ChIJ…) 또는 구글 지도 업체 페이지 URL'}
              style={{ width: '100%', resize: 'vertical', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void fetchPrefill()}
              style={{
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 10,
                border: 'none',
                cursor: busy ? 'wait' : 'pointer',
                background: '#0f172a',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              장소 불러오기 · 폼 채우기 (prefill-place)
            </button>
          </div>
        </div>

        <fieldset
          style={{
            margin: 0,
            padding: '14px 14px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            display: 'grid',
            gap: 12,
          }}
        >
          <legend style={{ fontWeight: 800, fontSize: 12 }}>등록될 레코드 (수정 가능)</legend>

          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>google_place_id *</span>
            <input
              value={create.google_place_id}
              onChange={(e) => setCreate({ ...create, google_place_id: e.target.value })}
              placeholder="예: ChIJ… (프리필 또는 직접 입력)"
              style={fld}
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>업체명 *</span>
            <input
              value={create.name}
              onChange={(e) => setCreate({ ...create, name: e.target.value })}
              style={fld}
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>주소 (프리필 후 수정 가능)</span>
            <textarea
              rows={3}
              value={create.address}
              onChange={(e) => setCreate({ ...create, address: e.target.value })}
              style={{ ...fld, minHeight: 72 }}
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>전화</span>
            <input value={create.phone} onChange={(e) => setCreate({ ...create, phone: e.target.value })} style={fld} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800 }}>위도</span>
              <input value={create.lat} onChange={(e) => setCreate({ ...create, lat: e.target.value })} style={fld} />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800 }}>경도</span>
              <input value={create.lng} onChange={(e) => setCreate({ ...create, lng: e.target.value })} style={fld} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800 }}>카테고리 *</span>
              <select
                value={create.category}
                onChange={(e) => setCreate({ ...create, category: e.target.value as KoreanBizCategory })}
                style={fld}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800 }}>지역 *</span>
              <select
                value={create.region}
                onChange={(e) =>
                  setCreate({
                    ...create,
                    region: e.target.value as CreateForm['region'],
                  })
                }
                style={fld}
              >
                {REGIONS.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>LINE URL</span>
            <input
              value={create.line_url}
              onChange={(e) => setCreate({ ...create, line_url: e.target.value })}
              placeholder="https://line.me/…"
              style={fld}
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800 }}>WhatsApp URL</span>
            <input
              value={create.whatsapp_url}
              onChange={(e) => setCreate({ ...create, whatsapp_url: e.target.value })}
              placeholder="https://wa.me/…"
              style={fld}
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void submitCreate()}
            style={{
              justifySelf: 'start',
              minHeight: 50,
              minWidth: 200,
              borderRadius: 10,
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              background: '#16a34a',
              color: '#fff',
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            신규 등록 (CREATE + 즉시 프로브)
          </button>
        </fieldset>
      </section>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void load()}
          style={{
            minHeight: 44,
            padding: '0 16px',
            borderRadius: 10,
            border: '1px solid #94a3b8',
            background: '#fff',
            cursor: busy ? 'wait' : 'pointer',
            fontWeight: 650,
          }}
        >
          목록 새로고침
        </button>
        {loading ? (
          <span style={{ fontSize: 13, opacity: 0.82 }}>로딩…</span>
        ) : (
          <span style={{ fontSize: 13, opacity: 0.82 }}>
            업체 수 <strong>{rows.length}</strong>
          </span>
        )}
        {msg ? <span style={{ fontSize: 13, color: '#2563eb' }}>{msg}</span> : null}
      </div>

      <div className="tj-biz-grid">
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '8px 0 10px', fontSize: 14, letterSpacing: '0.06em', fontWeight: 900 }}>목록 선택</h3>
          <div
            style={{
              maxHeight: 520,
              overflow: 'auto',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#fff',
            }}
          >
            {(rows ?? []).map((r) => {
              const b = badgeContact(r);
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => {
                    setSelectedId(r.id);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: selectedId === r.id ? '1px solid #7c3aed' : '1px solid transparent',
                    borderBottom: '1px solid #e5e7eb',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    font: 'inherit',
                    background: selectedId === r.id ? '#f5f3ff' : '#fff',
                    minHeight: 56,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 13 }}>{r.name}</strong>
                    <span
                      style={{
                        color: b.fg,
                        background: b.bg,
                        padding: '2px 7px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {b.label}
                    </span>
                  </div>
                  <div style={{ paddingTop: 4, opacity: 0.65, fontSize: 11, wordBreak: 'break-all' }}>
                    {r.google_place_id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {!form ? (
            <div style={{ fontSize: 13, opacity: 0.8 }}>표에서 수정·삭제할 업체를 선택하세요.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <h3 style={{ margin: '8px 0 0', fontSize: 14, letterSpacing: '0.06em', fontWeight: 900 }}>
                수정 / 삭제
              </h3>
              <p style={{ margin: '0', fontSize: 11, opacity: 0.65, wordBreak: 'break-all' }}>
                place_id 고정 참조:&nbsp;<code>{form.google_place_id}</code>{' '}
                <span style={{ opacity: 0.8 }}>
                  — 고유값 변경은 레이더·크론과 충돌할 수 있어 UI에서 제공하지 않습니다.
                </span>
              </p>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>업체명</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={fld}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>주소</span>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={3}
                  style={{ ...fld, minHeight: 76 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>전화</span>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={fld}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>LINE URL</span>
                <input
                  value={editLine}
                  onChange={(e) => setEditLine(e.target.value)}
                  placeholder="https://line.me/…"
                  style={fld}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>WhatsApp URL</span>
                <input
                  value={editWa}
                  onChange={(e) => setEditWa(e.target.value)}
                  placeholder="https://wa.me/…"
                  style={fld}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>카테고리</span>
                <select
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value as KoreanBizCategory)}
                  style={fld}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.l}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>지역</span>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value as typeof editRegion)}
                  style={fld}
                >
                  {REGIONS.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.l}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patchRow()}
                  style={{
                    minHeight: 50,
                    padding: '0 20px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: busy ? 'wait' : 'pointer',
                    fontWeight: 800,
                    background: '#7c3aed',
                    color: '#fff',
                  }}
                >
                  저장 (UPDATE + 즉시 프로브)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteRow()}
                  style={{
                    minHeight: 50,
                    padding: '0 20px',
                    borderRadius: 10,
                    border: '1px solid #fecaca',
                    cursor: busy ? 'wait' : 'pointer',
                    fontWeight: 800,
                    background: '#fff1f2',
                    color: '#b91c1c',
                  }}
                >
                  삭제 (DELETE)
                </button>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.72 }}>
                last check:&nbsp;
                {form.contact_checked_at ? new Date(form.contact_checked_at).toLocaleString('ko-KR') : '—'} · 상태:{' '}
                {form.contact_link_ok === true ? '인증 통과' : form.contact_link_ok === false ? '불량' : '미검사'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
