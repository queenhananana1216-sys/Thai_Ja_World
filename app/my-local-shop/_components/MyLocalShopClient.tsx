'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type LocalSpotOwnerRow = {
  id: string;
  name: string;
  slug: string;
  minihome_public_slug: string | null;
  is_published: boolean;
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

export default function MyLocalShopClient() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<LocalSpotOwnerRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        intro: string;
        themeJson: string;
        bgmUrl: string;
        menuJson: string;
        layoutJson: string;
        extraJson: string;
      }
    >
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setUserId(null);
      setRows([]);
      setDrafts({});
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data, error } = await sb
      .from('local_spots')
      .select(
        'id,name,slug,minihome_public_slug,is_published,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra',
      )
      .eq('owner_profile_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      const list = (data ?? []) as LocalSpotOwnerRow[];
      setRows(list);
      const next: typeof drafts = {};
      for (const r of list) {
        next[r.id] = {
          intro: r.minihome_intro ?? '',
          themeJson: stringifyJson(r.minihome_theme, '{}'),
          bgmUrl: r.minihome_bgm_url ?? '',
          menuJson: stringifyJson(r.minihome_menu, '[]'),
          layoutJson: stringifyJson(r.minihome_layout_modules, '["intro","menu","line","photos"]'),
          extraJson: stringifyJson(r.minihome_extra, '{}'),
        };
      }
      setDrafts(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRow(id: string) {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setMsg(null);
    try {
      let minihome_theme: Record<string, unknown>;
      let minihome_menu: unknown[];
      let minihome_layout_modules: unknown[];
      let minihome_extra: Record<string, unknown>;
      try {
        minihome_theme = JSON.parse(d.themeJson) as Record<string, unknown>;
        if (!minihome_theme || typeof minihome_theme !== 'object' || Array.isArray(minihome_theme)) {
          throw new Error('theme');
        }
      } catch {
        setMsg('테마 JSON 형식이 올바르지 않습니다.');
        setSavingId(null);
        return;
      }
      try {
        const m = JSON.parse(d.menuJson) as unknown;
        minihome_menu = Array.isArray(m) ? m : [];
      } catch {
        setMsg('메뉴 JSON은 배열이어야 합니다.');
        setSavingId(null);
        return;
      }
      try {
        const l = JSON.parse(d.layoutJson) as unknown;
        minihome_layout_modules = Array.isArray(l) ? l : ['intro', 'menu', 'line', 'photos'];
      } catch {
        setMsg('레이아웃 JSON은 배열이어야 합니다.');
        setSavingId(null);
        return;
      }
      try {
        minihome_extra = JSON.parse(d.extraJson) as Record<string, unknown>;
        if (!minihome_extra || typeof minihome_extra !== 'object' || Array.isArray(minihome_extra)) {
          throw new Error('extra');
        }
      } catch {
        setMsg('확장 JSON 형식이 올바르지 않습니다.');
        setSavingId(null);
        return;
      }

      const sb = createBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        setMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
        setSavingId(null);
        return;
      }
      const { error } = await sb
        .from('local_spots')
        .update({
          minihome_intro: d.intro.trim() || null,
          minihome_theme,
          minihome_bgm_url: d.bgmUrl.trim() || null,
          minihome_menu,
          minihome_layout_modules,
          minihome_extra,
        })
        .eq('id', id)
        .eq('owner_profile_id', user.id);

      if (error) {
        setMsg(error.message);
      } else {
        setMsg('저장했습니다.');
        await load();
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p style={{ color: '#64748b' }}>불러오는 중…</p>;
  }

  if (!userId) {
    return (
      <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <p style={{ marginBottom: 12 }}>로그인 후 이용할 수 있습니다.</p>
        <Link href="/auth/login" style={{ color: '#7c3aed', fontWeight: 600 }}>
          로그인
        </Link>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ color: '#64748b' }}>
        연결된 로컬 가게가 없습니다. 운영진에게 오너 이메일 등록을 요청하세요.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {msg && (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      )}
      {rows.map((r) => {
        const d = drafts[r.id];
        if (!d) return null;
        const shopHref = r.minihome_public_slug ? `/shop/${r.minihome_public_slug}` : null;
        return (
          <section
            key={r.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 18,
              background: '#fff',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 6px' }}>{r.name}</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              내부 슬러그 <code>{r.slug}</code>
              {r.is_published ? ' · 목록 공개' : ' · 목록 비공개(오너는 편집 가능)'}
              {shopHref ? (
                <>
                  {' '}
                  ·{' '}
                  <Link href={shopHref} style={{ color: '#7c3aed' }}>
                    공개 미니홈
                  </Link>
                </>
              ) : (
                ' · 공개 미니홈 슬러그 미설정'
              )}
            </p>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>소개</span>
              <textarea
                value={d.intro}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...d, intro: e.target.value } }))}
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                BGM URL (mp3 등)
              </span>
              <input
                value={d.bgmUrl}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...d, bgmUrl: e.target.value } }))}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
                placeholder="https://..."
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>테마 JSON</span>
              <textarea
                value={d.themeJson}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [r.id]: { ...d, themeJson: e.target.value } }))
                }
                rows={4}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>메뉴 JSON 배열</span>
              <textarea
                value={d.menuJson}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [r.id]: { ...d, menuJson: e.target.value } }))
                }
                rows={6}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>레이아웃 순서</span>
              <textarea
                value={d.layoutJson}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [r.id]: { ...d, layoutJson: e.target.value } }))
                }
                rows={2}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>확장 JSON</span>
              <textarea
                value={d.extraJson}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [r.id]: { ...d, extraJson: e.target.value } }))
                }
                rows={2}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <button
              type="button"
              disabled={savingId === r.id}
              onClick={() => void saveRow(r.id)}
              style={{
                padding: '10px 18px',
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: savingId === r.id ? 'wait' : 'pointer',
                opacity: savingId === r.id ? 0.7 : 1,
              }}
            >
              {savingId === r.id ? '저장 중…' : '이 가게 저장'}
            </button>
          </section>
        );
      })}
    </div>
  );
}
