import Link from 'next/link';
import OpsRunPanel from './_components/OpsRunPanel';
import { createServiceRoleClient } from '@/lib/supabase/admin';

type BotActionRow = {
  bot_name: string;
  status: 'running' | 'success' | 'failed' | 'skipped' | 'queued';
  created_at: string;
  error_message: string | null;
};

const WATCH_BOTS = [
  'news_curator',
  'news_summarizer',
  'knowledge_curator_collect',
  'knowledge_curator_process',
  'ux_admin_optimizer',
] as const;

function tone(status: BotActionRow['status'] | 'missing'): { label: string; color: string; bg: string } {
  if (status === 'success') return { label: '정상', color: '#166534', bg: '#dcfce7' };
  if (status === 'running') return { label: '실행중', color: '#92400e', bg: '#fef3c7' };
  if (status === 'failed') return { label: '실패', color: '#991b1b', bg: '#fee2e2' };
  if (status === 'skipped') return { label: '스킵', color: '#334155', bg: '#e2e8f0' };
  return { label: '미확인', color: '#334155', bg: '#e2e8f0' };
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

export default async function AdminOpsCenterPage() {
  let note: string | null = null;
  let latestByBot: Record<string, BotActionRow | null> = Object.fromEntries(
    WATCH_BOTS.map((b) => [b, null]),
  );
  let draftNews: number | null = null;
  let draftKnowledge: number | null = null;

  try {
    const admin = createServiceRoleClient();
    const [actionRes, newsRes, knowledgeRes] = await Promise.all([
      admin
        .from('bot_actions')
        .select('bot_name,status,created_at,error_message')
        .in('bot_name', [...WATCH_BOTS])
        .order('created_at', { ascending: false })
        .limit(300),
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', false),
      admin.from('processed_knowledge').select('*', { count: 'exact', head: true }).eq('published', false),
    ]);

    if (actionRes.error) throw new Error(actionRes.error.message);
    if (newsRes.error) throw new Error(newsRes.error.message);
    if (knowledgeRes.error) throw new Error(knowledgeRes.error.message);

    draftNews = newsRes.count ?? 0;
    draftKnowledge = knowledgeRes.count ?? 0;

    const rows = (actionRes.data ?? []) as BotActionRow[];
    const map = Object.fromEntries(WATCH_BOTS.map((b) => [b, null])) as Record<string, BotActionRow | null>;
    for (const row of rows) {
      if (row.bot_name in map && !map[row.bot_name]) {
        map[row.bot_name] = row;
      }
    }
    latestByBot = map;
  } catch (e) {
    note = e instanceof Error ? e.message : String(e);
  }

  const cards = [
    { key: 'news_curator', label: '뉴스 수집' },
    { key: 'news_summarizer', label: '뉴스 가공' },
    { key: 'knowledge_curator_collect', label: '꿀정보 수집' },
    { key: 'knowledge_curator_process', label: '꿀정보 가공' },
    { key: 'ux_admin_optimizer', label: 'UX 최적화' },
  ] as const;

  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">운영 통합센터</h1>
      <p className="admin-dash__lead">
        뉴스·꿀정보·UX 봇을 한 번에 실행하고 상태를 확인하는 운영 대시보드입니다.
      </p>
      {note ? <div className="admin-dash__alert">{note}</div> : null}

      <OpsRunPanel />

      <section className="admin-dash__pipeline" style={{ marginBottom: 16 }}>
        <h2>파이프라인 상태</h2>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {cards.map((c) => {
            const row = latestByBot[c.key];
            const badge = tone(row?.status ?? 'missing');
            return (
              <article key={c.key} className="admin-dash__card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div className="admin-dash__card-label">{c.label}</div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '2px 8px',
                      color: badge.color,
                      background: badge.bg,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="admin-dash__card-hint">
                  {row ? `${minutesAgo(row.created_at)}분 전` : '기록 없음'}
                </div>
                {row?.error_message ? (
                  <p style={{ marginTop: 6, fontSize: 11, color: '#991b1b' }}>{row.error_message}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-dash__pipeline">
        <h2>승인 대기 큐</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/admin/news" className="admin-shell__nav-brand" style={{ padding: '8px 10px' }}>
            뉴스 초안 {draftNews ?? '—'}건
          </Link>
          <Link href="/admin/knowledge" className="admin-shell__nav-brand" style={{ padding: '8px 10px' }}>
            꿀정보 초안 {draftKnowledge ?? '—'}건
          </Link>
          <Link href="/admin/ux-bot" className="admin-shell__nav-brand" style={{ padding: '8px 10px' }}>
            UX 플래그 화면
          </Link>
        </div>
      </section>
    </main>
  );
}

