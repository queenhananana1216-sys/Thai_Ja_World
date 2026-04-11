'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MinihomePublicRow } from '@/types/minihome';
import { parseLayoutModules, parseSectionVisibility, parseTheme, safeAccent } from '@/types/minihome';
import type { SectionVisibility } from '@/types/minihome';
import { createBrowserClient } from '@/lib/supabase/client';

const FALLBACK_ACCENT = '#7c3aed';

type EntryKind = 'open' | 'ilchon';

type GbRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  entry_kind: EntryKind;
  is_hidden: boolean;
};

type Props = {
  data: MinihomePublicRow;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CyWindow({
  title,
  open,
  onClose,
  accent,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  accent: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="panel"
      style={{ borderColor: accent, marginTop: '1rem', position: 'relative' }}
      role="dialog"
    >
      <div style={{ background: `${accent}18`, padding: '0.5rem 1rem', margin: '-1rem -1.25rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        <button type="button" onClick={onClose} style={{ background: 'transparent', color: 'var(--text)', border: 'none', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}>
          ×
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function MinihomeRoomView({ data }: Props) {
  const theme = parseTheme(data.theme);
  const accent = safeAccent(theme.accent, FALLBACK_ACCENT);
  const modules = parseLayoutModules(data.layout_modules);
  const minimi = theme.minimi?.trim();

  const [winGuest, setWinGuest] = useState(false);
  const [winVisitor, setWinVisitor] = useState(false);
  const [gbRows, setGbRows] = useState<GbRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [gbLoading, setGbLoading] = useState(false);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [openBody, setOpenBody] = useState('');
  const [postBusy, setPostBusy] = useState<'ilchon' | 'open' | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<string | null>(null);

  const isOwner = viewerId !== null && viewerId === data.owner_id;

  const sectionVis = useMemo(() => parseSectionVisibility(data.section_visibility), [data.section_visibility]);

  const canViewSection = useCallback(
    (section: string): boolean => {
      if (isOwner) return true;
      const vis: SectionVisibility = sectionVis[section] ?? 'public';
      if (vis === 'public') return true;
      // 일촌 기능은 아직 auto에 없으므로, public이 아니면 본인만 볼 수 있다고 가정
      return false;
    },
    [isOwner, sectionVis],
  );

  const openRows = useMemo(() => (gbRows ?? []).filter((r) => r.entry_kind === 'open'), [gbRows]);

  const loadGuestbook = useCallback(async () => {
    if (!data.owner_id) return;
    setGbLoading(true);
    setPostErr(null);
    const sb = createBrowserClient();
    const { data: rows, error } = await sb
      .from('minihome_guestbook_entries')
      .select('id, body, created_at, author_id, entry_kind, is_hidden')
      .eq('minihome_owner_id', data.owner_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !rows) {
      setGbRows([]);
      setNames({});
      setGbLoading(false);
      return;
    }

    const list: GbRow[] = rows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author_id: r.author_id,
      is_hidden: r.is_hidden,
      entry_kind: (r.entry_kind === 'ilchon' ? 'ilchon' : 'open') as EntryKind,
    }));
    setGbRows(list);
    const ids = [...new Set(list.map((r) => r.author_id))];
    if (ids.length === 0) {
      setNames({});
      setGbLoading(false);
      return;
    }
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', ids);
    const map: Record<string, string> = {};
    for (const p of profs ?? []) {
      map[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
    }
    setNames(map);
    setGbLoading(false);
  }, [data.owner_id]);

  useEffect(() => {
    const sb = createBrowserClient();
    void sb.auth.getUser().then(({ data: { user } }) => {
      setViewerId(user?.id ?? null);
      if (user && user.id !== data.owner_id) {
        void sb.rpc('minihome_record_visit', { p_owner_id: data.owner_id });
      }
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [data.owner_id]);

  useEffect(() => {
    if (!winGuest && !winVisitor) return;
    void loadGuestbook();
  }, [winGuest, winVisitor, loadGuestbook]);

  function toggle(setter: (v: boolean) => void, cur: boolean) {
    setter(!cur);
  }

  const loginNext = `/?next=${encodeURIComponent(`/minihome/${data.public_slug}`)}`;

  async function submitGuestbook(kind: EntryKind) {
    const body = openBody.trim();
    if (body.length < 2) {
      setPostErr('내용을 2자 이상 입력해주세요.');
      return;
    }
    if (!data.owner_id || !viewerId) return;
    setPostBusy(kind);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb.from('minihome_guestbook_entries').insert({
      minihome_owner_id: data.owner_id,
      author_id: viewerId,
      body,
      entry_kind: kind,
    });
    setPostBusy(null);
    if (error) {
      setPostErr(error.message);
      return;
    }
    setOpenBody('');
    await loadGuestbook();
  }

  async function toggleHidden(row: GbRow) {
    if (!isOwner) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('minihome_guestbook_entries')
      .update({ is_hidden: !row.is_hidden })
      .eq('id', row.id)
      .eq('minihome_owner_id', data.owner_id);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await loadGuestbook();
  }

  async function deleteEntry(row: GbRow) {
    if (!isOwner || !confirm('정말 삭제하시겠습니까?')) return;
    setModBusy(row.id);
    setPostErr(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('minihome_guestbook_entries')
      .delete()
      .eq('id', row.id)
      .eq('minihome_owner_id', data.owner_id);
    setModBusy(null);
    if (error) setPostErr(error.message);
    else await loadGuestbook();
  }

  function renderGbList(rows: GbRow[]) {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((r) => (
          <li
            key={r.id}
            style={{
              opacity: r.is_hidden ? 0.72 : 1,
              padding: '0.75rem 0',
              borderBottom: '1px solid var(--border)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
              {names[r.author_id] ?? 'member'} · {formatDate(r.created_at)}
              {r.is_hidden ? (
                <span style={{ marginLeft: 8, fontWeight: 'bold', color: 'var(--danger)' }}>
                  [숨김]
                </span>
              ) : null}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.body}</div>
            {isOwner ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                  disabled={modBusy === r.id}
                  onClick={() => void toggleHidden(r)}
                >
                  {modBusy === r.id ? '…' : r.is_hidden ? '숨김 해제' : '숨기기'}
                </button>
                <button
                  type="button"
                  className="danger"
                  style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                  disabled={modBusy === r.id}
                  onClick={() => void deleteEntry(r)}
                >
                  삭제
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const showOpenComposer = viewerId && viewerId !== data.owner_id;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="panel" style={{ border: `2px solid ${accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>{minimi || '🏠'}</div>
          <div>
            <h1 style={{ margin: 0 }}>{data.title ?? data.public_slug}</h1>
            <p className="muted" style={{ margin: 0 }}>/{data.public_slug}</p>
          </div>
        </div>
        
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'right', marginBottom: '1rem' }}>
          TODAY {data.visit_count_today ?? 0} | TOTAL {data.visit_count_total ?? 0}
        </div>

        {canViewSection('intro') ? (
          data.intro_body ? (
            <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {data.intro_body}
            </div>
          ) : (
            <p className="muted">소개글이 없습니다.</p>
          )
        ) : (
          <p className="muted">🔒 비공개 섹션입니다.</p>
        )}
      </div>

      <div className="row" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={!winVisitor ? '' : 'secondary'}
          onClick={() => setWinVisitor(false)}
        >
          🏠 홈
        </button>
        {modules.includes('guestbook') && canViewSection('guestbook') ? (
          <button
            type="button"
            className={winVisitor ? '' : 'secondary'}
            onClick={() => toggle(setWinVisitor, winVisitor)}
          >
            📖 방명록
          </button>
        ) : null}
      </div>

      <CyWindow
        title="방명록"
        open={winVisitor}
        onClose={() => setWinVisitor(false)}
        accent={accent}
      >
        {postErr && winVisitor ? (
          <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{postErr}</p>
        ) : null}
        
        {gbLoading ? (
          <p className="muted">로딩 중...</p>
        ) : openRows.length === 0 ? (
          <p className="muted">아직 작성된 방명록이 없습니다.</p>
        ) : (
          renderGbList(openRows)
        )}

        {showOpenComposer ? (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <textarea
              value={openBody}
              onChange={(e) => setOpenBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="방명록을 남겨보세요..."
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <button
              type="button"
              disabled={postBusy === 'open'}
              onClick={() => void submitGuestbook('open')}
            >
              {postBusy === 'open' ? '등록 중...' : '등록'}
            </button>
          </div>
        ) : viewerId === null ? (
          <p style={{ marginTop: 12 }}>
            <Link href={loginNext}>로그인</Link>하고 방명록을 남겨보세요.
          </p>
        ) : isOwner ? (
          <p className="muted" style={{ marginTop: 12 }}>
            주인은 자신의 방명록에 글을 남길 수 없습니다.
          </p>
        ) : null}
      </CyWindow>
    </div>
  );
}
