'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  name: string;
  minihome_public_slug: string | null;
  is_published: boolean;
};

type Props = {
  /** 연결된 가게 없음 — 운영 모델 안내 */
  emptyFollowup?: string;
  /** /contact 링크 라벨 */
  contactCta?: string;
};

export default function MyLocalShopHub({ emptyFollowup, contactCta }: Props) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

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
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data, error } = await sb
      .from('local_spots')
      .select('id,name,minihome_public_slug,is_published')
      .eq('owner_profile_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      setMsg(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p style={{ color: '#64748b' }}>불러오는 중…</p>;
  }

  if (!userId) {
    return (
      <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <p style={{ marginBottom: 12 }}>로그인 후 이용할 수 있습니다.</p>
        <Link href="/auth/login?next=/my-local-shop" style={{ color: '#7c3aed', fontWeight: 600 }}>
          로그인
        </Link>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          background: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          color: '#64748b',
        }}
      >
        <p style={{ margin: 0 }}>연결된 로컬 가게가 없습니다. 운영진에게 오너 계정 연결을 요청하세요.</p>
        {emptyFollowup ? (
          <p style={{ margin: '14px 0 0', lineHeight: 1.55, fontSize: 14 }}>{emptyFollowup}</p>
        ) : null}
        {contactCta ? (
          <p style={{ margin: '16px 0 0' }}>
            <Link href="/contact" style={{ color: '#7c3aed', fontWeight: 600 }}>
              {contactCta}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg ? <p style={{ fontSize: 14, color: '#dc2626' }}>{msg}</p> : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r) => {
          const shopHref = r.minihome_public_slug ? `/shop/${r.minihome_public_slug}` : null;
          return (
            <li
              key={r.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
                background: '#fff',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{r.name}</strong>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                  {r.is_published ? '목록 공개' : '목록 비공개(오너는 편집 가능)'}
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
              </div>
              <Link
                href={`/my-local-shop/${r.id}`}
                style={{
                  padding: '10px 18px',
                  background: '#7c3aed',
                  color: '#fff',
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                내 가게 관리
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
