'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Row = {
  minihome_intro: string | null;
  minihome_theme: unknown;
  minihome_bgm_url: string | null;
  minihome_menu: unknown;
  minihome_layout_modules: unknown;
  minihome_extra: unknown;
};

function stringifyJson(v: unknown, fallback: string): string {
  try {
    return JSON.stringify(v ?? (fallback.startsWith('[') ? [] : {}), null, 2);
  } catch {
    return fallback;
  }
}

export default function OwnerShopAdvancedClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [intro, setIntro] = useState('');
  const [themeJson, setThemeJson] = useState('{}');
  const [bgmUrl, setBgmUrl] = useState('');
  const [menuJson, setMenuJson] = useState('[]');
  const [layoutJson, setLayoutJson] = useState('["intro","menu","line","photos"]');
  const [extraJson, setExtraJson] = useState('{}');

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
      .select('minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
    } else if (data) {
      const r = data as Row;
      setIntro(r.minihome_intro ?? '');
      setThemeJson(stringifyJson(r.minihome_theme, '{}'));
      setBgmUrl(r.minihome_bgm_url ?? '');
      setMenuJson(stringifyJson(r.minihome_menu, '[]'));
      setLayoutJson(stringifyJson(r.minihome_layout_modules, '["intro","menu","line","photos"]'));
      setExtraJson(stringifyJson(r.minihome_extra, '{}'));
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
    try {
      let minihome_theme: Record<string, unknown>;
      let minihome_menu: unknown[];
      let minihome_layout_modules: unknown[];
      let minihome_extra: Record<string, unknown>;
      try {
        minihome_theme = JSON.parse(themeJson) as Record<string, unknown>;
        if (!minihome_theme || typeof minihome_theme !== 'object' || Array.isArray(minihome_theme)) {
          throw new Error('theme');
        }
      } catch {
        setMsg('테마 JSON 형식이 올바르지 않습니다.');
        setSaving(false);
        return;
      }
      try {
        const m = JSON.parse(menuJson) as unknown;
        minihome_menu = Array.isArray(m) ? m : [];
      } catch {
        setMsg('메뉴 JSON은 배열이어야 합니다.');
        setSaving(false);
        return;
      }
      try {
        const l = JSON.parse(layoutJson) as unknown;
        minihome_layout_modules = Array.isArray(l) ? l : ['intro', 'menu', 'line', 'photos'];
      } catch {
        setMsg('레이아웃 JSON은 배열이어야 합니다.');
        setSaving(false);
        return;
      }
      try {
        minihome_extra = JSON.parse(extraJson) as Record<string, unknown>;
        if (!minihome_extra || typeof minihome_extra !== 'object' || Array.isArray(minihome_extra)) {
          throw new Error('extra');
        }
      } catch {
        setMsg('확장 JSON 형식이 올바르지 않습니다.');
        setSaving(false);
        return;
      }

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
        .update({
          minihome_intro: intro.trim() || null,
          minihome_theme,
          minihome_bgm_url: bgmUrl.trim() || null,
          minihome_menu,
          minihome_layout_modules,
          minihome_extra,
        })
        .eq('id', id)
        .eq('owner_profile_id', user.id);

      if (error) setMsg(error.message);
      else {
        setMsg('저장했습니다.');
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        소개·메뉴는 상단 «소개글 수정»·«메뉴 수정»에서 다루는 것을 권장합니다. 여기서는 테마·BGM·레이아웃·확장 JSON을 한 번에 맞출 수
        있습니다.
      </p>
      {msg ? (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>소개</span>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>BGM URL (mp3 등)</span>
        <input
          value={bgmUrl}
          onChange={(e) => setBgmUrl(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
          placeholder="https://..."
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>테마 JSON</span>
        <textarea
          value={themeJson}
          onChange={(e) => setThemeJson(e.target.value)}
          rows={4}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>메뉴 JSON 배열</span>
        <textarea
          value={menuJson}
          onChange={(e) => setMenuJson(e.target.value)}
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>레이아웃 순서</span>
        <textarea
          value={layoutJson}
          onChange={(e) => setLayoutJson(e.target.value)}
          rows={2}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>확장 JSON (영업시간 등)</span>
        <textarea
          value={extraJson}
          onChange={(e) => setExtraJson(e.target.value)}
          rows={4}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
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
        {saving ? '저장 중…' : '고급 항목 저장'}
      </button>
    </div>
  );
}
