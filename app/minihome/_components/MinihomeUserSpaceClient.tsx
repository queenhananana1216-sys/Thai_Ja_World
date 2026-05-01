'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

export type MinihomeVisibility = 'public' | 'friends' | 'private';

type DiaryRow = {
  id: string;
  title: string;
  body: string;
  mood: string | null;
  visibility: MinihomeVisibility;
  created_at: string;
};

type GalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_storage_path: string | null;
  items: unknown;
  visibility: MinihomeVisibility;
  sort_order: number;
  created_at: string;
};

type GuestRow = {
  id: string;
  author_id: string;
  body: string;
  visibility: MinihomeVisibility;
  created_at: string;
};

type ShellRow = {
  owner_id: string;
  status_message: string | null;
  skin: Record<string, unknown> | null;
  bgm: string | null;
  visibility: MinihomeVisibility;
  created_at?: string;
  updated_at?: string;
};

type TabKey = 'home' | 'photos' | 'diary' | 'guest';

function glassCard(className = '') {
  return [
    'rounded-2xl border border-white/10 bg-white/[0.06]',
    'shadow-[0_12px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl backdrop-saturate-150',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

function VisibilitySelect({
  value,
  disabled,
  onChange,
  labels,
}: {
  value: MinihomeVisibility;
  disabled?: boolean;
  onChange: (v: MinihomeVisibility) => void;
  labels: { public: string; friends: string; private: string };
}) {
  return (
    <select
      className="min-w-[8.5rem] rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MinihomeVisibility)}
      aria-label={labels.public}
    >
      <option value="public">{labels.public}</option>
      <option value="friends">{labels.friends}</option>
      <option value="private">{labels.private}</option>
    </select>
  );
}

export default function MinihomeUserSpaceClient(props: {
  locale: string;
  labels: Record<
    string,
    string | undefined
  > & {
    visibilityPublic: string;
    visibilityFriends: string;
    visibilityPrivate: string;
  };
  profile: { displayName: string; avatarUrl: string | null };
  home: {
    ownerId: string;
    publicSlug: string;
    title: string | null;
    tagline: string | null;
    introBody: string | null;
    isPublic: boolean;
    visitToday: number;
    visitTotal: number;
  };
  shell: ShellRow;
  initialDiaries: DiaryRow[];
  initialGalleries: GalleryRow[];
  initialGuestbook: GuestRow[];
  isOwner: boolean;
  viewerId: string | null;
}) {
  const {
    labels: L,
    profile,
    home,
    shell: shellInit,
    initialDiaries,
    initialGalleries,
    initialGuestbook,
    isOwner,
    viewerId,
  } = props;

  const [tab, setTab] = useState<TabKey>('home');
  const [shell, setShell] = useState(shellInit);
  const [diaries, setDiaries] = useState(initialDiaries);
  const [galleries, setGalleries] = useState(initialGalleries);
  const [guestbook, setGuestbook] = useState(initialGuestbook);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [diaryTitle, setDiaryTitle] = useState('');
  const [diaryBody, setDiaryBody] = useState('');
  const [diaryVis, setDiaryVis] = useState<MinihomeVisibility>('friends');
  const [galTitle, setGalTitle] = useState('');
  const [galVis, setGalVis] = useState<MinihomeVisibility>('public');
  const [guestBody, setGuestBody] = useState('');
  const [showDiaryForm, setShowDiaryForm] = useState(false);
  const [showGalForm, setShowGalForm] = useState(false);
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [statusDraft, setStatusDraft] = useState(shell.status_message ?? '');

  const visLabels = useMemo(
    (): { public: string; friends: string; private: string } => ({
      public: L.visibilityPublic,
      friends: L.visibilityFriends,
      private: L.visibilityPrivate,
    }),
    [L.visibilityFriends, L.visibilityPrivate, L.visibilityPublic],
  );

  const sb = useMemo(() => createBrowserClient(), []);

  const toast = useCallback((text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 3200);
  }, []);

  const refreshLists = useCallback(async () => {
    const [dRes, gRes, gbRes] = await Promise.all([
      sb
        .from('minihome_diaries')
        .select('id, title, body, mood, visibility, created_at')
        .eq('owner_id', home.ownerId)
        .order('created_at', { ascending: false })
        .limit(40),
      sb
        .from('minihome_galleries')
        .select('id, title, description, cover_storage_path, items, visibility, sort_order, created_at')
        .eq('owner_id', home.ownerId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(40),
      sb
        .from('minihome_guestbooks')
        .select('id, author_id, body, visibility, created_at')
        .eq('minihome_owner_id', home.ownerId)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    if (dRes.data) setDiaries(dRes.data as DiaryRow[]);
    if (gRes.data) setGalleries(gRes.data as GalleryRow[]);
    if (gbRes.data) setGuestbook(gbRes.data as GuestRow[]);
  }, [home.ownerId, sb]);

  const saveShellVisibility = async (v: MinihomeVisibility) => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb.from('minihomes').update({ visibility: v }).eq('owner_id', home.ownerId);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    setShell((s) => ({ ...s, visibility: v }));
    toast('공개 범위가 저장되었습니다.');
  };

  const saveStatusMessage = async () => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb
      .from('minihomes')
      .update({ status_message: statusDraft })
      .eq('owner_id', home.ownerId);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    setShell((s) => ({ ...s, status_message: statusDraft }));
    setShowStatusEdit(false);
    toast('상태 메시지를 저장했습니다.');
  };

  const insertDiary = async () => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb.from('minihome_diaries').insert({
      owner_id: home.ownerId,
      title: diaryTitle.trim() || '무제',
      body: diaryBody.trim() || '',
      visibility: diaryVis,
    });
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    setDiaryTitle('');
    setDiaryBody('');
    setShowDiaryForm(false);
    await refreshLists();
    toast('다이어리를 남겼습니다.');
  };

  const insertGallery = async () => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb.from('minihome_galleries').insert({
      owner_id: home.ownerId,
      title: galTitle.trim() || '새 사진첩',
      items: [],
      visibility: galVis,
      sort_order: galleries.length,
    });
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    setGalTitle('');
    setShowGalForm(false);
    await refreshLists();
    toast('사진첩을 만들었습니다.');
  };

  const insertGuest = async () => {
    if (!viewerId) {
      toast('로그인 후 방명록을 남길 수 있습니다.');
      return;
    }
    const body = guestBody.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await sb.from('minihome_guestbooks').insert({
      minihome_owner_id: home.ownerId,
      author_id: viewerId,
      body,
      visibility: 'public',
    });
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    setGuestBody('');
    await refreshLists();
    toast('방명록을 남겼습니다.');
  };

  const updateDiaryVis = async (id: string, v: MinihomeVisibility) => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb.from('minihome_diaries').update({ visibility: v }).eq('id', id).eq('owner_id', home.ownerId);
    setBusy(false);
    if (error) toast(error.message);
    else {
      setDiaries((rows) => rows.map((r) => (r.id === id ? { ...r, visibility: v } : r)));
    }
  };

  const updateGalleryVis = async (id: string, v: MinihomeVisibility) => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb
      .from('minihome_galleries')
      .update({ visibility: v })
      .eq('id', id)
      .eq('owner_id', home.ownerId);
    setBusy(false);
    if (error) toast(error.message);
    else setGalleries((rows) => rows.map((r) => (r.id === id ? { ...r, visibility: v } : r)));
  };

  const updateGuestVis = async (id: string, v: MinihomeVisibility) => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb
      .from('minihome_guestbooks')
      .update({ visibility: v })
      .eq('id', id)
      .eq('minihome_owner_id', home.ownerId);
    setBusy(false);
    if (error) toast(error.message);
    else setGuestbook((rows) => rows.map((r) => (r.id === id ? { ...r, visibility: v } : r)));
  };

  const tabs = useMemo(
    () =>
      [
        { key: 'home' as const, label: L.home },
        { key: 'photos' as const, label: L.photos },
        { key: 'diary' as const, label: L.diary },
        { key: 'guest' as const, label: L.guestbook },
      ],
    [L.diary, L.guestbook, L.home, L.photos],
  );

  const accent = 'from-violet-500/25 to-sky-500/15';

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className={`${glassCard('lg:w-[320px] shrink-0 p-5')}`}>
        <div className={`mb-4 rounded-xl bg-gradient-to-br ${accent} p-px`}>
          <div className="rounded-[11px] bg-[#0c101c]/90 p-4">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3 h-28 w-28 overflow-hidden rounded-full ring-2 ring-white/15 ring-offset-2 ring-offset-[#0b0f19]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/40 to-sky-600/30 text-3xl font-bold text-white/90">
                    {profile.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">{home.title ?? profile.displayName}</h1>
              <p className="mt-1 text-xs text-white/55">{home.publicSlug}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-violet-100/85">
                {shell.status_message?.trim() ? shell.status_message : '…'}
              </p>
              <div className="mt-3 flex w-full justify-center gap-4 text-[11px] text-white/45">
                <span>Today {home.visitToday}</span>
                <span>Total {home.visitTotal}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-white/35">태자월드 · CYWORLD 2026</p>
      </aside>

      <section className="min-w-0 flex-1 space-y-4">
        <div className={glassCard('p-1')}>
          <div className="flex flex-wrap gap-1 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === t.key
                    ? 'bg-white/12 text-white shadow-inner shadow-black/30'
                    : 'text-white/55 hover:bg-white/6 hover:text-white'
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {msg ? (
          <div className="rounded-lg border border-amber-400/25 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">{msg}</div>
        ) : null}

        {tab === 'home' ? (
          <div className={`${glassCard('space-y-4 p-5')}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{L.home}</h2>
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => {
                      setStatusDraft(shell.status_message ?? '');
                      setShowStatusEdit((v) => !v);
                    }}
                  >
                    {L.write}
                  </button>
                  <span className="text-[11px] text-white/40">{L.visibility}</span>
                  <VisibilitySelect
                    value={shell.visibility}
                    disabled={busy}
                    onChange={(v) => void saveShellVisibility(v)}
                    labels={visLabels}
                  />
                </div>
              ) : null}
            </div>
            {isOwner && showStatusEdit ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                <textarea
                  className="min-h-[88px] w-full resize-y rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  placeholder={L.status}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    onClick={() => setShowStatusEdit(false)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-violet-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void saveStatusMessage()}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : null}
            <div className="prose prose-invert prose-sm max-w-none text-white/85">
              <p className="whitespace-pre-wrap leading-relaxed">
                {home.introBody?.trim()
                  ? home.introBody
                  : home.tagline?.trim()
                    ? home.tagline
                    : L.shellIntroFallback}
              </p>
            </div>
          </div>
        ) : null}

        {tab === 'diary' ? (
          <div className={`${glassCard('space-y-4 p-5')}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{L.diary}</h2>
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                    onClick={() => setShowDiaryForm((v) => !v)}
                  >
                    {L.write}
                  </button>
                  <span className="text-[11px] text-white/40">{L.visibility}</span>
                  <VisibilitySelect
                    value={diaryVis}
                    disabled={busy}
                    onChange={setDiaryVis}
                    labels={visLabels}
                  />
                </div>
              ) : null}
            </div>
            {isOwner && showDiaryForm ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={diaryTitle}
                  onChange={(e) => setDiaryTitle(e.target.value)}
                  placeholder={L.diaryTitlePlaceholder}
                />
                <textarea
                  className="min-h-[120px] w-full resize-y rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={diaryBody}
                  onChange={(e) => setDiaryBody(e.target.value)}
                  placeholder={L.diaryBodyPlaceholder}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg bg-sky-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void insertDiary()}
                  >
                    등록
                  </button>
                </div>
              </div>
            ) : null}
            {diaries.length === 0 ? (
              <p className="text-sm text-white/45">{L.emptyDiary}</p>
            ) : (
              <ul className="space-y-3">
                {diaries.map((row) => (
                  <li key={row.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{row.title || '무제'}</p>
                        <p className="text-[11px] text-white/40">{new Date(row.created_at).toLocaleString(props.locale)}</p>
                      </div>
                      {isOwner ? (
                        <VisibilitySelect value={row.visibility} disabled={busy} onChange={(v) => void updateDiaryVis(row.id, v)} labels={visLabels} />
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{row.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'photos' ? (
          <div className={`${glassCard('space-y-4 p-5')}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{L.photos}</h2>
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                    onClick={() => setShowGalForm((v) => !v)}
                  >
                    {L.write}
                  </button>
                  <span className="text-[11px] text-white/40">{L.visibility}</span>
                  <VisibilitySelect value={galVis} disabled={busy} onChange={setGalVis} labels={visLabels} />
                </div>
              ) : null}
            </div>
            {isOwner && showGalForm ? (
              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
                <input
                  className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={galTitle}
                  onChange={(e) => setGalTitle(e.target.value)}
                  placeholder={L.galleryTitlePlaceholder}
                />
                <button
                  type="button"
                  className="rounded-lg bg-fuchsia-600/90 px-3 py-2 text-xs font-medium text-white hover:bg-fuchsia-500 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void insertGallery()}
                >
                  만들기
                </button>
              </div>
            ) : null}
            {galleries.length === 0 ? (
              <p className="text-sm text-white/45">{L.emptyPhotos}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {galleries.map((g) => (
                  <li key={g.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium text-white">{g.title}</p>
                      {isOwner ? (
                        <VisibilitySelect value={g.visibility} disabled={busy} onChange={(v) => void updateGalleryVis(g.id, v)} labels={visLabels} />
                      ) : null}
                    </div>
                    {g.description ? <p className="text-xs text-white/55">{g.description}</p> : null}
                    <p className="mt-2 text-[11px] text-white/35">
                      {Array.isArray(g.items) ? `${g.items.length}장` : '0장'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'guest' ? (
          <div className={`${glassCard('space-y-4 p-5')}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{L.guestbook}</h2>
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                  <span>{L.visibility}</span>
                  <span className="text-white/35">항목별로 선택하세요</span>
                </div>
              ) : null}
            </div>

            {viewerId ? (
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <textarea
                  className="min-h-[72px] w-full resize-y rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={guestBody}
                  onChange={(e) => setGuestBody(e.target.value)}
                  placeholder={L.guestPlaceholder}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    disabled={busy || !guestBody.trim()}
                    onClick={() => void insertGuest()}
                  >
                    {L.sendGuest}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/55">
                방명록을 남기려면{' '}
                <Link className="text-sky-300 underline-offset-4 hover:underline" href={`/auth/login?next=${encodeURIComponent(`/minihome/${home.publicSlug}`)}`}>
                  로그인
                </Link>
                하세요.
              </p>
            )}

            {guestbook.length === 0 ? (
              <p className="text-sm text-white/45">{L.emptyGuest}</p>
            ) : (
              <ul className="space-y-3">
                {guestbook.map((row) => (
                  <li key={row.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[11px] text-white/40">{new Date(row.created_at).toLocaleString(props.locale)}</p>
                      {isOwner ? (
                        <VisibilitySelect value={row.visibility} disabled={busy} onChange={(v) => void updateGuestVis(row.id, v)} labels={visLabels} />
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-white/85">{row.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
