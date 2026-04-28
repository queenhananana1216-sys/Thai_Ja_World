import Link from 'next/link';
import OpsRunPanel from './_components/OpsRunPanel';
import OpsLogStreamClient from './_components/OpsLogStreamClient';
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

function tone(status: BotActionRow['status'] | 'missing'): { label: string; className: string } {
  if (status === 'success') return { label: '정상', className: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30' };
  if (status === 'running') return { label: '실행중', className: 'text-amber-300 bg-amber-500/10 border border-amber-500/30' };
  if (status === 'failed') return { label: '실패', className: 'text-rose-300 bg-rose-500/10 border border-rose-500/30' };
  if (status === 'skipped') return { label: '스킵', className: 'text-slate-300 bg-slate-700/40 border border-slate-600' };
  return { label: '미확인', className: 'text-slate-300 bg-slate-700/40 border border-slate-600' };
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

type PublicHealthCard = { label: string; count: number | null; target: string; hint: string };
type PublishLogRow = {
  id: string;
  target_id: string;
  published_at: string;
  meta: Record<string, unknown>;
};

export default async function AdminOpsCenterPage() {
  let note: string | null = null;
  let latestByBot: Record<string, BotActionRow | null> = Object.fromEntries(
    WATCH_BOTS.map((b) => [b, null]),
  );
  let draftNews: number | null = null;
  let draftKnowledge: number | null = null;
  const publicHealth: PublicHealthCard[] = [];
  let activePauseCount = 0;
  let topErrorReason = '-';
  let fallbackRecoveredCount = 0;
  let streamRows: Array<{
    id: string;
    pipelineId: string;
    event: string;
    status: string;
    at: string;
    reason: string;
    isActivePause: boolean;
  }> = [];

  try {
    const admin = createServiceRoleClient();
    const [actionRes, newsRes, knowledgeRes, logsRes] = await Promise.all([
      admin
        .from('bot_actions')
        .select('bot_name,status,created_at,error_message')
        .in('bot_name', [...WATCH_BOTS])
        .order('created_at', { ascending: false })
        .limit(300),
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', false),
      admin.from('processed_knowledge').select('*', { count: 'exact', head: true }).eq('published', false),
      admin
        .from('publish_logs')
        .select('id,target_id,published_at,meta')
        .eq('channel', 'cron_pipeline')
        .eq('target_type', 'cron_pipeline')
        .order('published_at', { ascending: false })
        .limit(400),
    ]);

    if (actionRes.error) throw new Error(actionRes.error.message);
    if (newsRes.error) throw new Error(newsRes.error.message);
    if (knowledgeRes.error) throw new Error(knowledgeRes.error.message);
    if (logsRes.error) throw new Error(logsRes.error.message);

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

    // 홈 "광장 심박수" 카드 5개가 각각 무엇으로 채워지는지 공개 쪽에서 실제 몇 건인지 집계.
    // 여기 숫자가 0 이면 홈 섹션도 비어 보임 → 어디를 먼저 살려야 할지 한눈에.
    const [publicNews, publicTips, publicFree, publicQuestion, publicRestaurant] = await Promise.all([
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', true),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('category', 'info')
        .eq('is_knowledge_tip', true),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('category', 'free'),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('category', 'info')
        .eq('is_knowledge_tip', false),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('category', 'restaurant'),
    ]);

    publicHealth.push(
      {
        label: '뉴스 (processed_news published=true)',
        count: publicNews.count ?? 0,
        target: '/api/cron/news',
        hint: '4시간마다',
      },
      {
        label: '정보·꿀팁 (posts is_knowledge_tip=true)',
        count: publicTips.count ?? 0,
        target: '/api/cron/knowledge',
        hint: '12시간마다',
      },
      {
        label: '자유토론 (posts category=free)',
        count: publicFree.count ?? 0,
        target: '/community/boards?cat=free',
        hint: '이용자 작성',
      },
      {
        label: '질문답변 (posts category=info, is_knowledge_tip=false)',
        count: publicQuestion.count ?? 0,
        target: '/community/boards?cat=info',
        hint: '이용자 작성',
      },
      {
        label: '동네·맛집 (posts category=restaurant)',
        count: publicRestaurant.count ?? 0,
        target: '/community/boards?cat=restaurant',
        hint: '이용자 작성',
      },
    );

    const logs = (logsRes.data ?? []) as PublishLogRow[];
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const activePauseByPipeline = new Map<string, boolean>();
    const errorCounts = new Map<string, number>();
    const timelineByPipeline = new Map<
      string,
      Array<{ event: string; status: string; at: number; reason: string; id: string }>
    >();

    for (const row of logs) {
      const meta = (row.meta ?? {}) as Record<string, unknown>;
      const event = String(meta.event ?? '');
      const status = String(meta.status ?? '');
      const reason = String(meta.reason ?? '');
      const atMs = Date.parse(String(meta.at ?? row.published_at));

      if (!activePauseByPipeline.has(row.target_id)) {
        if (event === 'force_resume') activePauseByPipeline.set(row.target_id, false);
        else if (event === 'self_heal_pause') {
          const pausedUntil = Date.parse(String(meta.paused_until ?? ''));
          activePauseByPipeline.set(row.target_id, Number.isFinite(pausedUntil) && pausedUntil > now);
        } else activePauseByPipeline.set(row.target_id, false);
      }

      if (status === 'failed' && atMs >= dayAgo && reason) {
        errorCounts.set(reason, (errorCounts.get(reason) ?? 0) + 1);
      }

      const list = timelineByPipeline.get(row.target_id) ?? [];
      list.push({ event, status, at: atMs, reason, id: row.id });
      timelineByPipeline.set(row.target_id, list);
    }

    activePauseCount = Array.from(activePauseByPipeline.values()).filter(Boolean).length;
    const topError = Array.from(errorCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    topErrorReason = topError ? `${topError[0]} (${topError[1]})` : '-';

    for (const timeline of timelineByPipeline.values()) {
      const asc = [...timeline].sort((a, b) => a.at - b.at);
      for (let i = 1; i < asc.length; i += 1) {
        const current = asc[i];
        const prev = asc[i - 1];
        if (!current || !prev) continue;
        if (current.status === 'success' && prev.status === 'failed') fallbackRecoveredCount += 1;
      }
    }

    streamRows = logs.slice(0, 140).map((row) => {
      const meta = (row.meta ?? {}) as Record<string, unknown>;
      const event = String(meta.event ?? 'unknown');
      return {
        id: row.id,
        pipelineId: row.target_id,
        event,
        status: String(meta.status ?? 'unknown'),
        at: String(meta.at ?? row.published_at),
        reason: String(meta.reason ?? ''),
        isActivePause: event === 'self_heal_pause' && Boolean(activePauseByPipeline.get(row.target_id)),
      };
    });
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
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-6">
      <h1 className="mb-1 text-xl font-semibold">운영 통합센터</h1>
      <p className="mb-4 text-sm text-slate-300">
        뉴스·꿀정보·UX 봇을 한 번에 실행하고 상태를 확인하는 운영 대시보드입니다.
      </p>
      {note ? <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-300">{note}</div> : null}

      <OpsRunPanel />

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
          <p className="truncate text-xs text-slate-400">🛡️ 시스템 자율 방어 (Self-Heal Pauses)</p>
          <div className="mt-2 flex items-center gap-2">
            <strong className="text-2xl font-bold">{activePauseCount}</strong>
            {activePauseCount > 0 ? <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> : null}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
          <p className="truncate text-xs text-slate-400">⚠️ 최다 발생 에러 (Top Error Reason)</p>
          <p className="mt-2 truncate text-sm text-amber-300">{topErrorReason}</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
          <p className="truncate text-xs text-slate-400">🔄 복구 횟수 (Fallback Count)</p>
          <strong className="mt-2 block text-2xl font-bold text-emerald-300">{fallbackRecoveredCount}</strong>
        </article>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">파이프라인 상태</h2>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((c) => {
            const row = latestByBot[c.key];
            const badge = tone(row?.status ?? 'missing');
            return (
              <article key={c.key} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs text-slate-300">{c.label}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-500">
                  {row ? `${minutesAgo(row.created_at)}분 전` : '기록 없음'}
                </div>
                {row?.error_message ? (
                  <p className="mt-1 truncate text-[11px] text-rose-300">{row.error_message}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">홈 &quot;광장 심박수&quot; 채움 현황</h2>
        <p className="mb-2 text-xs text-slate-400">
          홈 랜딩 5개 컬럼이 실제 공개 DB 기준 몇 건인지. 0 이면 해당 카드가 비어 보이므로,
          해당 크론·카테고리를 먼저 점검하세요.
        </p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {publicHealth.map((c) => {
            const empty = !c.count || c.count === 0;
            return (
              <article
                key={c.label}
                className={`rounded-lg border p-3 ${empty ? 'border-rose-500/40 bg-rose-500/10' : 'border-slate-700 bg-slate-900/60'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-xs text-slate-300">{c.label}</div>
                  <strong className={`text-lg ${empty ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {c.count ?? '—'}
                  </strong>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">
                  <Link href={c.target} className="text-cyan-300">
                    {c.target}
                  </Link>{' '}
                  · {c.hint}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <OpsLogStreamClient rows={streamRows} />

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">승인 대기 큐</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/news" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-200">
            뉴스 초안 {draftNews ?? '—'}건
          </Link>
          <Link href="/admin/knowledge" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-200">
            꿀정보 초안 {draftKnowledge ?? '—'}건
          </Link>
          <Link href="/admin/ux-bot" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-200">
            UX 플래그 화면
          </Link>
        </div>
      </section>
    </main>
  );
}

