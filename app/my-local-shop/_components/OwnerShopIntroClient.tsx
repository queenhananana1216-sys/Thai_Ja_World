'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function OwnerShopIntroClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [intro, setIntro] = useState('');
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
      .select('minihome_intro')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    if (error) setMsg(error.message);
    else setIntro(data?.minihome_intro ?? '');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!id) return;
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
      .update({ minihome_intro: intro.trim() || null })
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
      {msg ? (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>소개글</span>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={8}
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
        {saving ? '저장 중…' : '소개글 저장'}
      </button>
    </div>
  );
}
