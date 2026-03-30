'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as Record<string, unknown>) };
  return {};
}

export default function OwnerShopHoursClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [extraObj, setExtraObj] = useState<Record<string, unknown>>({});
  const [hoursText, setHoursText] = useState('');
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
      .select('minihome_extra')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    if (error) {
      setMsg(error.message);
    } else {
      const o = asRecord(data?.minihome_extra);
      setExtraObj(o);
      const h = o.opening_hours_text;
      setHoursText(typeof h === 'string' ? h : '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!id) return;
    setSaving(true);
    setMsg(null);
    const next: Record<string, unknown> = { ...extraObj };
    const t = hoursText.trim();
    if (t) next.opening_hours_text = t;
    else delete next.opening_hours_text;

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
      .update({ minihome_extra: next })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) setMsg(error.message);
    else {
      setMsg('저장했습니다.');
      setExtraObj(next);
    }
    setSaving(false);
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        내용은 가게 미니홈 확장 데이터(<code>minihome_extra.opening_hours_text</code>)에 저장됩니다. 공개 페이지에 노출되게 하려면 이후
        미니홈 UI에서 이 필드를 읽어 표시하면 됩니다.
      </p>
      {msg ? (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>영업시간 (자유 입력)</span>
        <textarea
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
          rows={6}
          placeholder={'예: 월–금 11:00–22:00 / 토 12:00–23:00 / 일 정기 휴무'}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
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
        {saving ? '저장 중…' : '영업시간 저장'}
      </button>
    </div>
  );
}
