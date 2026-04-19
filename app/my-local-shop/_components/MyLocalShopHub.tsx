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

export default function MyLocalShopHub() {
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
    return <p className="owner-shop-hub__muted">불러오는 중…</p>;
  }

  if (!userId) {
    return (
      <div className="card owner-shop-hub__gate">
        <p className="owner-shop-hub__gate-msg">로그인 후 이용할 수 있습니다.</p>
        <Link href="/auth/login?next=/my-local-shop" className="owner-shop-hub__link">
          로그인
        </Link>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="owner-shop-hub__muted">
        연결된 로컬 가게가 없습니다. 운영진에게 오너 계정 연결을 요청하세요.
      </p>
    );
  }

  return (
    <div className="owner-shop-hub">
      {msg ? <p className="owner-shop-hub__error">{msg}</p> : null}
      <ul className="owner-shop-hub__list">
        {rows.map((r) => {
          const shopHref = r.minihome_public_slug ? `/shop/${r.minihome_public_slug}` : null;
          return (
            <li key={r.id} className="card owner-shop-hub__item">
              <div className="owner-shop-hub__item-main">
                <strong className="owner-shop-hub__name">{r.name}</strong>
                <p className="owner-shop-hub__meta">
                  {r.is_published ? '목록 공개' : '목록 비공개(오너는 편집 가능)'}
                  {shopHref ? (
                    <>
                      {' '}
                      ·{' '}
                      <Link href={shopHref} className="owner-shop-hub__link">
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
                className="board-form__submit owner-shop-hub__manage"
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
