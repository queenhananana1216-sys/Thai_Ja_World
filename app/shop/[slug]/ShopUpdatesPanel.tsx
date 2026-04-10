'use client';

import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  kind: 'notice' | 'special_menu' | 'hours' | 'other';
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

const KIND_LABEL: Record<AnnouncementRow['kind'], string> = {
  notice: '공지',
  special_menu: '특별 메뉴',
  hours: '영업 안내',
  other: '안내',
};

function fmt(v: string | null): string {
  if (!v) return '일정 미정';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '일정 미정';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ShopUpdatesPanel({ spotId }: { spotId: string }) {
  const [loading, setLoading] = useState(true);
  const [annRows, setAnnRows] = useState<AnnouncementRow[]>([]);
  const [eventRows, setEventRows] = useState<EventRow[]>([]);

  const load = useCallback(async () => {
    if (!spotId) return;
    setLoading(true);
    const sb = createBrowserClient();
    const [ann, events] = await Promise.all([
      sb
        .from('local_spot_announcements')
        .select('id,title,body,kind,created_at')
        .eq('local_spot_id', spotId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4),
      sb
        .from('local_spot_events')
        .select('id,title,body,starts_at,ends_at')
        .eq('local_spot_id', spotId)
        .eq('is_published', true)
        .order('starts_at', { ascending: true, nullsFirst: false })
        .limit(4),
    ]);
    setAnnRows((ann.data ?? []) as AnnouncementRow[]);
    setEventRows((events.data ?? []) as EventRow[]);
    setLoading(false);
  }, [spotId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section style={{ marginTop: 20 }}>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>업데이트 불러오는 중…</p>
      </section>
    );
  }

  if (annRows.length === 0 && eventRows.length === 0) return null;

  return (
    <section style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>가게 업데이트</h2>
      <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
        {annRows.length > 0 ? (
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>최근 공지</p>
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
              {annRows.map((row) => (
                <li key={row.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 13 }}>{row.title}</strong>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>{KIND_LABEL[row.kind]}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{row.body}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {eventRows.length > 0 ? (
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>다가오는 이벤트</p>
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
              {eventRows.map((row) => (
                <li key={row.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong style={{ fontSize: 13 }}>{row.title}</strong>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                    {fmt(row.starts_at)}
                    {row.ends_at ? ` ~ ${fmt(row.ends_at)}` : ''}
                  </div>
                  {row.body ? (
                    <div style={{ marginTop: 4, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{row.body}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
