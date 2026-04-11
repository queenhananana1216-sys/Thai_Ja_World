'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { parseTheme, safeAccent } from '@/types/minihome';

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [prof, setProf] = useState<ProfileRow | null>(null);
  
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [intro, setIntro] = useState('');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [wallpaperUrl, setWallpaperUrl] = useState('');
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
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      // auto 앱에는 /auth/login이 아직 없을 수 있지만, 일단 태자 월드 라우트와 동일하게 둔다.
      // 또는 / 경로로 리다이렉트
      router.replace(`/?next=${encodeURIComponent('/minihome')}`);
      return null;
    }
    
    const q = () =>
      sb.from('user_minihomes')
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
    const { data: { user } } = await sb.auth.getUser();
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
    const { data: { user } } = await sb.auth.getUser();
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
      setSaveMsg('저장 실패');
      return;
    }
    setSaveMsg('저장되었습니다.');
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
      setGreetErr(error.message);
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
    return <div className="panel"><p className="muted">로딩 중...</p></div>;
  }

  if (!row) {
    return (
      <div className="panel">
        <p style={{ color: 'var(--danger)' }}>미니홈 정보를 불러올 수 없습니다. 로그인이 필요합니다.</p>
        <Link href="/">← 홈으로</Link>
      </div>
    );
  }

  const score = prof?.style_score_total ?? null;
  const showGreet = prof && !prof.signup_greeting_done;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>내 미니홈 관리</h1>
      <div className="row" style={{ marginBottom: '1rem' }}>
        {score !== null && <span className="badge normal">스타일 점수: {score}</span>}
        <Link href={`/minihome/${row.public_slug}`}>
          <button className="secondary">공개 페이지 보기</button>
        </Link>
      </div>

      <div className="panel" style={{ border: `2px solid ${accent}` }}>
        <h2>미니홈에 오신 것을 환영합니다</h2>
        <p className="muted">아래에서 미니홈 설정을 변경할 수 있습니다.</p>
      </div>

      {showGreet ? (
        <div className="panel">
          <h2>가입 인사 남기기</h2>
          <p className="muted">인사를 남기면 스타일 점수를 받습니다.</p>
          <form onSubmit={(e) => void onGreetSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={greetBody}
              onChange={(e) => setGreetBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="안녕하세요!"
            />
            {greetErr && <p style={{ color: 'var(--danger)' }}>{greetErr}</p>}
            <button type="submit" disabled={greetBusy}>
              {greetBusy ? '제출 중...' : '작성 완료'}
            </button>
          </form>
        </div>
      ) : greetJustDone ? (
        <div className="panel">
          <p><strong>가입 인사를 남겼습니다!</strong> 감사합니다.</p>
        </div>
      ) : null}

      <form className="panel" onSubmit={(e) => void onSave(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2>미니홈 설정</h2>
        
        <label>
          미니홈 제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </label>

        <label>
          한 줄 소개
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} />
        </label>

        <label>
          소개글
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={5}
            maxLength={6000}
          />
        </label>

        <label>
          테마 색상 (Accent)
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </label>

        <label>
          배경 이미지 URL
          <input
            type="url"
            value={wallpaperUrl}
            onChange={(e) => setWallpaperUrl(e.target.value)}
            placeholder="https://"
          />
        </label>

        <label style={{ flexDirection: 'row', alignItems: 'center' }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          전체 공개 여부 (검색 및 방문 허용)
        </label>

        <div>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>섹션별 공개 범위</h3>
          {(['intro', 'guestbook', 'photos', 'diary'] as const).map((sec) => (
            <label key={sec} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>{sec === 'intro' ? '소개' : sec === 'guestbook' ? '방명록' : sec === 'photos' ? '사진첩' : '다이어리'}</span>
              <select
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
            </label>
          ))}
        </div>

        <p className="muted">
          내 미니홈 주소: <code>/minihome/{row.public_slug}</code>
        </p>

        {saveMsg && (
          <p style={{ color: saveMsg === '저장 실패' ? 'var(--danger)' : 'var(--ok)' }}>
            {saveMsg}
          </p>
        )}

        <button type="submit" disabled={saveBusy}>
          {saveBusy ? '저장 중...' : '설정 저장'}
        </button>
      </form>
    </div>
  );
}
