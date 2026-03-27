'use client';

/**
 * 로그인한 이용자 본인 미니홈 — 메타·메인룸 글·테마 편집 + 오버레이 미리보기.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { parseTheme, safeAccent } from '@/types/minihome';
import { useMinihomeOverlay } from './MinihomeOverlay';

const DEFAULT_ACCENT = '#7c3aed';

type Row = {
  owner_id: string;
  public_slug: string;
  title: string | null;
  tagline: string | null;
  intro_body: string | null;
  theme: unknown;
  is_public: boolean;
};

export default function MinihomeMe() {
  const { d } = useClientLocaleDictionary();
  const labels = d.minihome;
  const router = useRouter();
  const { open: openOverlay } = useMinihomeOverlay();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [intro, setIntro] = useState('');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadRow = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent('/minihome')}`);
      return null;
    }
    const { data, error } = await sb
      .from('user_minihomes')
      .select('owner_id, public_slug, title, tagline, intro_body, theme, is_public')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return data as Row;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadRow();
      if (cancelled) return;
      if (!data) {
        setRow(null);
        setLoading(false);
        return;
      }
      setRow(data);
      setTitle(data.title ?? '');
      setTagline(data.tagline ?? '');
      setIntro(data.intro_body ?? '');
      const t = parseTheme(data.theme);
      setAccent(safeAccent(t.accent, DEFAULT_ACCENT));
      setWallpaperUrl(t.wallpaper?.trim() ?? '');
      setIsPublic(data.is_public);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRow]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaveMsg(null);
    setSaveBusy(true);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setSaveBusy(false);
      return;
    }
    const nextTheme: Record<string, string> = {
      accent: safeAccent(accent, DEFAULT_ACCENT),
    };
    if (wallpaperUrl.trim()) {
      nextTheme.wallpaper = wallpaperUrl.trim();
    }
    const { error } = await sb
      .from('user_minihomes')
      .update({
        title: title.trim() || null,
        tagline: tagline.trim() || null,
        intro_body: intro.trim() || null,
        theme: nextTheme,
        is_public: isPublic,
      })
      .eq('owner_id', user.id);
    setSaveBusy(false);
    if (error) {
      setSaveMsg(labels.saveError);
      return;
    }
    setSaveMsg(labels.saved);
    const next = await loadRow();
    if (next) setRow(next);
  }

  if (loading) {
    return (
      <div className="page-body board-page">
        <p style={{ margin: 0, color: 'var(--tj-muted)' }}>…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="page-body board-page">
        <p style={{ color: '#be185d', fontSize: '0.9rem' }}>{labels.notProvisioned}</p>
        <Link href="/" style={{ color: 'var(--tj-link)' }}>
          ← home
        </Link>
      </div>
    );
  }

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{labels.pageTitle}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="board-form__submit"
            onClick={() => openOverlay(row.public_slug)}
          >
            {labels.previewOverlay}
          </button>
          <Link
            href={`/minihome/${row.public_slug}`}
            className="board-form__submit"
            style={{ textAlign: 'center', background: '#fff', color: 'var(--tj-ink)', border: '1px solid var(--tj-line)' }}
          >
            {labels.publicPage}
          </Link>
        </div>
      </div>

      <p style={{ margin: '0 0 18px', lineHeight: 1.55, color: 'var(--tj-muted)', fontSize: '0.9rem' }}>
        {labels.yourSpace}
      </p>

      <form className="board-form minihome-edit-form" onSubmit={(e) => void onSave(e)}>
        <h2 className="minihome-edit-form__h">{labels.editSectionTitle}</h2>
        <p className="minihome-edit-form__hint">{labels.editHint}</p>

        <label htmlFor="mh-title">{labels.fieldTitle}</label>
        <input id="mh-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />

        <label htmlFor="mh-tag">{labels.fieldTagline}</label>
        <input id="mh-tag" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} />

        <label htmlFor="mh-intro">{labels.fieldIntro}</label>
        <textarea
          id="mh-intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={8}
          maxLength={6000}
          placeholder=""
        />
        <p className="auth-field-hint">{labels.fieldIntroHint}</p>

        <label htmlFor="mh-accent">{labels.fieldAccent}</label>
        <input id="mh-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />

        <label htmlFor="mh-wall">{labels.fieldWallpaper}</label>
        <input
          id="mh-wall"
          type="url"
          value={wallpaperUrl}
          onChange={(e) => setWallpaperUrl(e.target.value)}
          placeholder="https://"
          autoComplete="off"
        />
        <p className="auth-field-hint">{labels.fieldWallpaperHint}</p>

        <label className="minihome-edit-form__check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {labels.fieldPublic}
        </label>

        <p className="auth-field-hint">{labels.layoutHint}</p>

        <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>
          {labels.slugLabel}: <code>/minihome/{row.public_slug}</code>
        </p>

        {saveMsg ? (
          <p className={saveMsg === labels.saved ? 'auth-field-hint' : 'auth-inline-error'} style={{ marginBottom: 8 }}>
            {saveMsg}
          </p>
        ) : null}

        <button type="submit" className="board-form__submit" disabled={saveBusy}>
          {saveBusy ? labels.saving : labels.save}
        </button>
      </form>

      <div className="card" style={{ padding: 18, marginTop: 22, opacity: 0.78 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{labels.guestbookLocked}</p>
      </div>
      <div className="card" style={{ padding: 18, marginTop: 12, opacity: 0.78 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{labels.albumLocked}</p>
      </div>
    </div>
  );
}
