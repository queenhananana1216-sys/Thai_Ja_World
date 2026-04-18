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
import { parseLayoutModules, parseTheme, safeAccent } from '@/types/minihome';
import { useMinihomeOverlay } from './MinihomeOverlay';

const DEFAULT_ACCENT = '#7c3aed';

type Row = {
  owner_id: string;
  public_slug: string;
  title: string | null;
  tagline: string | null;
  intro_body: string | null;
  theme: unknown;
  layout_modules: unknown;
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
  const [layoutModules, setLayoutModules] = useState<string[]>(['intro', 'guestbook', 'photos', 'diary']);
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
        .select('owner_id, public_slug, title, tagline, intro_body, theme, layout_modules, is_public, section_visibility')
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
      setLayoutModules(parseLayoutModules(data.layout_modules));
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
    const normalizedModules = Array.from(
      new Set(layoutModules.filter((m): m is 'intro' | 'guestbook' | 'photos' | 'diary' =>
        m === 'intro' || m === 'guestbook' || m === 'photos' || m === 'diary',
      )),
    );
    if (normalizedModules.length === 0) {
      normalizedModules.push('intro');
    }
    const { error } = await sb
      .from('user_minihomes')
      .update({
        title: title.trim() || null,
        tagline: tagline.trim() || null,
        intro_body: intro.trim() || null,
        theme: nextTheme,
        layout_modules: normalizedModules,
        is_public: isPublic,
        section_visibility: sectionVis,
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="m-0 text-lg font-bold text-rose-700">
            {locale === 'th' ? 'โหลดมินิโฮมไม่สำเร็จ' : '미니홈을 불러오지 못했습니다'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-700">
            {locale === 'th'
              ? 'อาจเกิดข้อผิดพลาดชั่วคราว ลองรีเฟรช หรือกลับหน้าแรกก่อน'
              : '일시 오류이거나 계정 연결이 늦은 상태일 수 있습니다. 새로고침 후 다시 확인해 주세요.'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-rose-700">{labels.notProvisioned}</p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-rose-800 no-underline hover:underline">
            ← {locale === 'th' ? 'กลับหน้าแรก' : '홈으로 이동'}
          </Link>
        </div>
      </div>
    );
  }

  const score = prof?.style_score_total ?? null;
  const showGreet = prof && !prof.signup_greeting_done;
  const isTh = locale === 'th';
  const quickLead = isTh
    ? 'ไม่ต้องไล่หาทีละช่อง เริ่มจาก 입장 → 공개 설정 → 꾸미기 เท่านี้ก็ใช้งานได้ครบ'
    : '기능을 찾느라 헤매지 않게, 입장 → 공개 설정 → 꾸미기 순서로 바로 끝낼 수 있게 구성했습니다.';
  const sectionPrivacyTitle = isTh ? 'การเปิดเผยแต่ละ 섹션' : '섹션별 공개 범위';
  const step1Title = isTh ? '1) เปิดห้องมินิโฮม' : '1) 미니홈 입장';
  const step1Desc = isTh
    ? 'ดูหน้า 공개 จริงก่อน แล้วค่อยปรับรายละเอียด'
    : '공개 페이지를 먼저 열어 보고, 보이는 화면 기준으로 수정하세요.';
  const step2Title = isTh ? '2) ตั้งค่าเปิดเผย' : '2) 공개 범위 설정';
  const step2Desc = isTh
    ? 'แยกเปิดเผย intro / guestbook / photos / diary ตามที่ต้องการ'
    : '소개/방명록/사진첩/다이어리를 각각 공개·일촌·비공개로 나눠 관리하세요.';
  const step3Title = isTh ? '3) แต่งสไตล์' : '3) 꾸미기';
  const step3Desc = isTh
    ? 'ปรับ accent / wallpaper / bgm ให้เข้าบรรยากาศห้อง'
    : 'accent, wallpaper, bgm을 정리해서 방 분위기를 통일하세요.';
  const saveNowLabel = isTh ? 'บันทึกตอนนี้' : '지금 저장하기';
  const panelTitle = isTh ? 'มินิโฮม 설정 패널' : '미니홈 설정 패널';
  const sectionLabels: Record<'intro' | 'guestbook' | 'photos' | 'diary', string> = {
    intro: isTh ? 'แนะนำตัว' : '소개',
    guestbook: isTh ? 'สมุดเยี่ยม' : '방명록',
    photos: isTh ? 'อัลบั้มรูป' : '사진첩',
    diary: isTh ? 'ไดอารี่' : '다이어리',
  };
  const visPublicLabel = isTh ? 'เปิดสาธารณะ' : '전체 공개';
  const visIlchonLabel = isTh ? 'อิลชอนเท่านั้น' : '일촌만';
  const visPrivateLabel = isTh ? 'ส่วนตัว (เฉพาะฉัน)' : '비공개 (나만)';
  const moduleTitle = isTh ? 'แสดงเมนูโมดูล' : '메뉴 노출 모듈';
  const moduleHint = isTh
    ? 'ซ่อนโมดูลที่ยังไม่เปิดใช้งานได้ (ปิดทั้งหมดจะเปิดห้องหลักอัตโนมัติ)'
    : '아직 쓰지 않는 모듈은 메뉴에서 숨길 수 있어요. (전부 끄면 메인룸은 자동 유지)';
  const publicPageLabel = row.is_public
    ? labels.publicPage
    : isTh
      ? 'สถานะส่วนตัว (ดูตัวอย่าง)'
      : '비공개 상태(미리보기)';
  const hasIntro = intro.trim().length > 0;
  const hasThemeDecoration = wallpaperUrl.trim().length > 0 || roomSkin.trim().length > 0 || bgmUrl.trim().length > 0;
  const hasCommunityOpen = ['guestbook', 'photos', 'diary'].some((sec) => (sectionVis[sec] ?? 'private') !== 'private');
  const progressSteps = [
    {
      key: 'quest',
      done: Boolean(prof?.signup_greeting_done),
      title: isTh ? '퀘스트 인사 완료' : '퀘스트 인사 완료',
      desc: isTh ? 'โพสต์ทักทายครั้งแรกเพื่อรับ 포인트' : '첫 인사글을 작성해 스타일 포인트를 받으세요.',
    },
    {
      key: 'intro',
      done: hasIntro,
      title: isTh ? '프로필 소개 작성' : '프로필 소개 작성',
      desc: isTh ? 'ใส่ intro ให้คนใหม่เข้าใจร้าน/방ทันที' : '소개글을 채워 방문자가 바로 이해할 수 있게 만드세요.',
    },
    {
      key: 'open',
      done: isPublic && (sectionVis.intro ?? 'public') === 'public',
      title: isTh ? '공개 세팅 완료' : '공개 세팅 완료',
      desc: isTh ? 'ตั้ง 공개 범위 ให้เข้ากับ 운영 방식' : '전체 공개/일촌 공개를 운영 목적에 맞게 설정하세요.',
    },
    {
      key: 'skin',
      done: hasThemeDecoration,
      title: isTh ? '스킨·BGM 적용' : '스킨·BGM 적용',
      desc: isTh ? 'ปรับ wallpaper / room skin / bgm ให้บรรยากาศชัด' : 'wallpaper, room skin, bgm으로 방 분위기를 완성하세요.',
    },
    {
      key: 'social',
      done: hasCommunityOpen,
      title: isTh ? '소통 모듈 오픈' : '소통 모듈 오픈',
      desc: isTh ? 'เปิด guestbook/photos/diary อย่างน้อย 1개' : '방명록/사진첩/다이어리 중 최소 1개를 공개해 소통을 시작하세요.',
    },
  ];
  const completedSteps = progressSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / progressSteps.length) * 100);

  return (
    <div className="page-body board-page">
      <section className="mb-6 rounded-3xl border border-violet-200/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900">{labels.pageTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{quickLead}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {score !== null ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                {labels.styleScoreLabel} {score}
              </span>
            ) : null}
            <Link href="/minihome/shop" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white no-underline">
              {labels.styleShopNav}
            </Link>
            <button
              type="button"
              onClick={() => openOverlay(row.public_slug, row.owner_id)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {labels.previewOverlay}
            </button>
            {row.is_public ? (
              <Link
                href={`/minihome/${row.public_slug}`}
                className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 no-underline"
              >
                {publicPageLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openOverlay(row.public_slug, row.owner_id)}
                className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
              >
                {publicPageLabel}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="m-0 text-xs font-semibold text-slate-500">{step1Title}</p>
            <p className="mt-1 text-sm text-slate-700">{step1Desc}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="m-0 text-xs font-semibold text-slate-500">{step2Title}</p>
            <p className="mt-1 text-sm text-slate-700">{step2Desc}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="m-0 text-xs font-semibold text-slate-500">{step3Title}</p>
            <p className="mt-1 text-sm text-slate-700">{step3Desc}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-900">
              {isTh ? 'แผนแต่งมินิโฮมทีละขั้น' : '미니홈 꾸미기 진행도'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isTh
                ? `ทำเสร็จแล้ว ${completedSteps}/${progressSteps.length} ขั้น (${progressPercent}%)`
                : `${completedSteps}/${progressSteps.length} 단계 완료 · ${progressPercent}%`}
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {isTh ? `คะแนนสไตล์ ${score ?? 0}` : `스타일 점수 ${score ?? 0}`}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {progressSteps.map((step) => (
            <div
              key={step.key}
              className={`rounded-xl border p-3 ${
                step.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <p className="m-0 text-xs font-semibold text-slate-500">
                {step.done ? (isTh ? '완료' : '완료') : (isTh ? '다음' : '다음')}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

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

      <form className="board-form minihome-edit-form rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(e) => void onSave(e)}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-xl font-bold text-slate-900">{panelTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{labels.editHint}</p>
          </div>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={saveBusy}>
            {saveBusy ? labels.saving : saveNowLabel}
          </button>
        </div>

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
        <div className="mh-section-privacy rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <p className="mh-section-privacy__title">{sectionPrivacyTitle}</p>
          {(['intro', 'guestbook', 'photos', 'diary'] as const).map((sec) => (
            <div key={sec} className="mh-section-privacy__row">
              <span className="mh-section-privacy__label">
                {sectionLabels[sec]}
              </span>
              <select
                className="mh-section-privacy__select"
                value={sectionVis[sec] ?? 'public'}
                onChange={(e) => {
                  const next = { ...sectionVis, [sec]: e.target.value };
                  setSectionVis(next);
                }}
              >
                <option value="public">{visPublicLabel}</option>
                <option value="ilchon">{visIlchonLabel}</option>
                <option value="private">{visPrivateLabel}</option>
              </select>
            </div>
          ))}
        </div>
        <div className="mh-section-privacy rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4" style={{ marginTop: 10 }}>
          <p className="mh-section-privacy__title">{moduleTitle}</p>
          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>{moduleHint}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
            {(['intro', 'guestbook', 'photos', 'diary'] as const).map((moduleId) => {
              const checked = layoutModules.includes(moduleId);
              return (
                <label
                  key={moduleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '8px 10px',
                    background: checked ? '#eef2ff' : '#fff',
                    fontSize: '0.82rem',
                    color: '#1f2937',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...layoutModules, moduleId]))
                        : layoutModules.filter((m) => m !== moduleId);
                      setLayoutModules(next);
                    }}
                  />
                  {sectionLabels[moduleId]}
                </label>
              );
            })}
          </div>
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
