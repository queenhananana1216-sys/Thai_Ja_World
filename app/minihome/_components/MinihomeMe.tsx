'use client';

/**
 * 로그인한 이용자 본인 미니홈 — 메타·메인룸 글·테마 편집 + 오버레이 미리보기.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { MINIHOME_THEME_PRESETS, themePresetLabel } from '@/lib/minihome/themePresets';
import { createBrowserClient } from '@/lib/supabase/client';
import { mapStyleRpcError } from '@/lib/minihome/styleRpcMessages';
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
  section_visibility: unknown;
};

type ProfileRow = {
  style_score_total: number;
  signup_greeting_done: boolean;
};

export default function MinihomeMe() {
  const { d, locale } = useClientLocaleDictionary();
  const labels = d.minihome;
  const router = useRouter();
  const { open: openOverlay } = useMinihomeOverlay();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [prof, setProf] = useState<ProfileRow | null>(null);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [intro, setIntro] = useState('');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [bgmUrl, setBgmUrl] = useState('');
  const [bgmTitle, setBgmTitle] = useState('');
  const [roomSkin, setRoomSkin] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [sectionVis, setSectionVis] = useState<Record<string, string>>({
    intro: 'public', guestbook: 'public', photos: 'ilchon', diary: 'ilchon',
  });
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [greetBody, setGreetBody] = useState('');
  const [greetBusy, setGreetBusy] = useState(false);
  const [greetErr, setGreetErr] = useState<string | null>(null);
  const [greetJustDone, setGreetJustDone] = useState(false);

  const loadRow = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent('/minihome')}`);
      return null;
    }
    const q = () =>
      sb
        .from('user_minihomes')
        .select('owner_id, public_slug, title, tagline, intro_body, theme, is_public, section_visibility')
        .eq('owner_id', user.id)
        .maybeSingle();

    let { data, error } = await q();
    if (error) return null;

    if (!data) {
      const { error: rpcErr } = await sb.rpc('ensure_my_minihome');
      if (rpcErr) return null;
      ({ data, error } = await q());
      if (error || !data) return null;
    }

    return data as Row;
  }, [router]);

  const loadProfile = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('style_score_total, signup_greeting_done')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      style_score_total: typeof data.style_score_total === 'number' ? data.style_score_total : 0,
      signup_greeting_done: Boolean(data.signup_greeting_done),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data, p] = await Promise.all([loadRow(), loadProfile()]);
      if (cancelled) return;
      if (!data) {
        setRow(null);
        setProf(null);
        setLoading(false);
        return;
      }
      setRow(data);
      setProf(p);
      setTitle(data.title ?? '');
      setTagline(data.tagline ?? '');
      setIntro(data.intro_body ?? '');
      const t = parseTheme(data.theme);
      setAccent(safeAccent(t.accent, DEFAULT_ACCENT));
      setWallpaperUrl(t.wallpaper?.trim() ?? '');
      setBgmUrl(t.bgm_url?.trim() ?? '');
      setBgmTitle(t.bgm_title?.trim() ?? '');
      setRoomSkin(t.room_skin?.trim() ?? '');
      setIsPublic(data.is_public);
      const sv = data.section_visibility;
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        setSectionVis({ intro: 'public', guestbook: 'public', photos: 'ilchon', diary: 'ilchon', ...(sv as Record<string, string>) });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRow, loadProfile]);

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
    const { data: fresh } = await sb.from('user_minihomes').select('theme').eq('owner_id', user.id).maybeSingle();
    const prev = parseTheme(fresh?.theme);
    const nextTheme: Record<string, string> = {
      accent: safeAccent(accent, DEFAULT_ACCENT),
    };
    if (wallpaperUrl.trim()) {
      nextTheme.wallpaper = wallpaperUrl.trim();
    }
    if (prev.minimi) {
      nextTheme.minimi = prev.minimi;
    }
    if (bgmUrl.trim()) {
      nextTheme.bgm_url = bgmUrl.trim();
    }
    if (bgmTitle.trim()) {
      nextTheme.bgm_title = bgmTitle.trim();
    }
    if (roomSkin.trim()) {
      nextTheme.room_skin = roomSkin.trim();
    }
    if (prev.profile_frame) {
      nextTheme.profile_frame = prev.profile_frame;
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

  async function onGreetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGreetErr(null);
    setGreetBusy(true);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('style_complete_signup_greeting', { p_body: greetBody });
    setGreetBusy(false);
    if (error) {
      setGreetErr(mapStyleRpcError(error.message, labels));
      return;
    }
    setGreetJustDone(true);
    setGreetBody('');
    const p = await loadProfile();
    setProf(p);
    const next = await loadRow();
    if (next) setRow(next);
  }

  if (loading) {
    return (
      <div className="page-body board-page">
        <p style={{ margin: 0, color: 'var(--tj-muted)' }}>{labels.loadingMark}</p>
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

  const score = prof?.style_score_total ?? null;
  const showGreet = prof && !prof.signup_greeting_done;

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{labels.pageTitle}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {score !== null ? (
            <span className="minihome-style-score-pill" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {labels.styleScoreLabel} {score}
            </span>
          ) : null}
          <Link href="/minihome/shop" className="board-form__submit" style={{ textAlign: 'center' }}>
            {labels.styleShopNav}
          </Link>
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

      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          border: `2px solid ${accent}`,
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.07), rgba(236, 72, 153, 0.06))',
        }}
      >
        <h2 className="minihome-edit-form__h" style={{ marginTop: 0, marginBottom: 8 }}>
          {labels.roomEnterTitle}
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
          {labels.roomEnterLead}
        </p>
        <Link
          href={`/minihome/${row.public_slug}`}
          className="board-form__submit"
          style={{ display: 'inline-block', textAlign: 'center' }}
        >
          {labels.roomEnterCta}
        </Link>
      </div>

      <p style={{ margin: '0 0 18px', lineHeight: 1.55, color: 'var(--tj-muted)', fontSize: '0.9rem' }}>
        {labels.yourSpace}
      </p>

      {showGreet ? (
        <div className="card minihome-greet-card" style={{ padding: 18, marginBottom: 22 }}>
          <h2 className="minihome-edit-form__h" style={{ marginTop: 0 }}>
            {labels.greetCardTitle}
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
            {labels.greetCardLead}
          </p>
          <form className="board-form" onSubmit={(e) => void onGreetSubmit(e)} style={{ gap: 10 }}>
            <textarea
              value={greetBody}
              onChange={(e) => setGreetBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={labels.greetPlaceholder}
            />
            {greetErr ? <p className="auth-inline-error">{greetErr}</p> : null}
            <button type="submit" className="board-form__submit" disabled={greetBusy}>
              {greetBusy ? labels.greetSubmitting : labels.greetSubmit}
            </button>
          </form>
        </div>
      ) : greetJustDone ? (
        <div className="card" style={{ padding: 14, marginBottom: 22, background: 'rgba(237, 233, 254, 0.45)' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
            <strong>{labels.greetDone}</strong> {labels.greetThanks}
          </p>
          <Link href="/minihome/shop" style={{ display: 'inline-block', marginTop: 10, color: 'var(--tj-link)' }}>
            {labels.styleShopNav} →
          </Link>
        </div>
      ) : null}

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
        <label htmlFor="mh-bgm-url">{locale === 'th' ? 'ลิงก์ BGM' : 'BGM URL'}</label>
        <input
          id="mh-bgm-url"
          type="url"
          value={bgmUrl}
          onChange={(e) => setBgmUrl(e.target.value)}
          placeholder="https://"
          autoComplete="off"
        />
        <label htmlFor="mh-bgm-title">{locale === 'th' ? 'ชื่อเพลง BGM' : 'BGM 제목'}</label>
        <input
          id="mh-bgm-title"
          type="text"
          value={bgmTitle}
          onChange={(e) => setBgmTitle(e.target.value)}
          maxLength={120}
        />
        <label htmlFor="mh-room-skin">{locale === 'th' ? 'ลิงก์พื้นหลังห้อง' : '룸 스킨 이미지 URL'}</label>
        <input
          id="mh-room-skin"
          type="url"
          value={roomSkin}
          onChange={(e) => setRoomSkin(e.target.value)}
          placeholder="https://"
          autoComplete="off"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {MINIHOME_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="ilchon-btn ilchon-btn--ghost"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              onClick={() => {
                setAccent(preset.accent);
                if (preset.wallpaper) setWallpaperUrl(preset.wallpaper);
                if (preset.room_skin) setRoomSkin(preset.room_skin);
              }}
            >
              {themePresetLabel(preset, locale)}
            </button>
          ))}
        </div>

        <label className="minihome-edit-form__check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {labels.fieldPublic}
        </label>

        {/* 섹션별 공개 설정 */}
        <div className="mh-section-privacy">
          <p className="mh-section-privacy__title">섹션별 공개 범위</p>
          {(['intro', 'guestbook', 'photos', 'diary'] as const).map((sec) => (
            <div key={sec} className="mh-section-privacy__row">
              <span className="mh-section-privacy__label">
                {sec === 'intro' ? '소개' : sec === 'guestbook' ? '방명록' : sec === 'photos' ? '사진첩' : '다이어리'}
              </span>
              <select
                className="mh-section-privacy__select"
                value={sectionVis[sec] ?? 'public'}
                onChange={(e) => {
                  const next = { ...sectionVis, [sec]: e.target.value };
                  setSectionVis(next);
                  const sb = createBrowserClient();
                  void sb.rpc('minihome_update_section_visibility', {
                    p_section: sec,
                    p_visibility: e.target.value,
                  });
                }}
              >
                <option value="public">전체 공개</option>
                <option value="ilchon">일촌만</option>
                <option value="private">비공개 (나만)</option>
              </select>
            </div>
          ))}
        </div>

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

      <div className="card" style={{ padding: 18, marginTop: 22 }}>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
          {labels.previewPanelsHint}
        </p>
      </div>
    </div>
  );
}
