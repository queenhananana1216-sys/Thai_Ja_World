'use client';

/**
 * 로그인한 이용자 본인 미니홈 — 공간 메타는 조회·수정 가능, 일촌평·사진첩은 UI만 잠금.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { createBrowserClient } from '@/lib/supabase/client';

type Row = {
  owner_id: string;
  public_slug: string;
  title: string | null;
  tagline: string | null;
  is_public: boolean;
};

export default function MinihomeMe({ labels }: { labels: Dictionary['minihome'] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setLoading(false);
          router.replace(`/auth/login?next=${encodeURIComponent('/minihome')}`);
        }
        return;
      }
      const { data, error } = await sb
        .from('user_minihomes')
        .select('owner_id, public_slug, title, tagline, is_public')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        if (error) {
          setRow(null);
        } else {
          setRow(data as Row | null);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="page-body board-page">
        <p style={{ margin: 0, color: '#64748b' }}>…</p>
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
        <Link href={`/minihome/${row.public_slug}`} className="board-form__submit" style={{ textAlign: 'center' }}>
          {labels.publicPage}
        </Link>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <p style={{ margin: '0 0 12px', lineHeight: 1.55 }}>{labels.yourSpace}</p>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
          <strong>{row.title ?? '—'}</strong>
          {row.tagline ? ` · ${row.tagline}` : null}
        </p>
        <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          {labels.slugLabel}:{' '}
          <code style={{ fontSize: '0.85em' }}>/minihome/{row.public_slug}</code>
        </p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 12, opacity: 0.72 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{labels.guestbookLocked}</p>
      </div>
      <div className="card" style={{ padding: 18, opacity: 0.72 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{labels.albumLocked}</p>
      </div>
    </div>
  );
}
