'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

function stringifyMenu(v: unknown): string {
  try {
    const m = v ?? [];
    return JSON.stringify(m, null, 2);
  } catch {
    return '[]';
  }
}

export default function OwnerShopMenuClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [menuJson, setMenuJson] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from('local_spots')
      .select('minihome_menu')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    if (error) setMsg(error.message);
    else setMenuJson(stringifyMenu(data?.minihome_menu));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!id) return;
    let minihome_menu: unknown[];
    try {
      const m = JSON.parse(menuJson) as unknown;
      minihome_menu = Array.isArray(m) ? m : [];
    } catch {
      setMsg('메뉴는 JSON 배열 형식이어야 합니다.');
      return;
    }
    setSaving(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
      setSaving(false);
      return;
    }
    const { error } = await sb
      .from('local_spots')
      .update({ minihome_menu })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) setMsg(error.message);
    else setMsg('저장했습니다.');
    setSaving(false);
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        항목 예: <code>[{`{ "name", "price", "description", "image_url", "sort_order" }`}]</code> — 스키마는 관리자 문서와 동일하게 맞추면
        공개 미니홈에 반영됩니다.
      </p>
      {msg ? (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>메뉴 JSON 배열</span>
        <textarea
          value={menuJson}
          onChange={(e) => setMenuJson(e.target.value)}
          rows={16}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
          }}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 18px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? '저장 중…' : '메뉴 저장'}
      </button>
    </div>
  );
}
