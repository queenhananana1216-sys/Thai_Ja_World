import Link from 'next/link';
import TaejaEditorialTips from '../_components/TaejaEditorialTips';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { isNewsSummaryLlmConfigured, stubOnLlmFailure } from '@/bots/actions/summarizeAndPersistNews';
import {
  isKnowledgeLlmConfigured,
  stubKnowledgeOnLlmFailure,
} from '@/bots/actions/processAndPersistKnowledge';

/**
 * 최종 배포·편집 기준 허브 — 뉴스·지식 큐로 이어지는 한 페이지 요약
 */
type BotActionLite = {
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
] as const;

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function latestByBot(rows: BotActionLite[]): Record<string, BotActionLite | null> {
  const out: Record<string, BotActionLite | null> = {};
  for (const name of WATCH_BOTS) out[name] = null;
  for (const row of rows) {
    if (!(row.bot_name in out) || out[row.bot_name]) continue;
    out[row.bot_name] = row;
  }
  return out;
}

function statusTone(status: BotActionLite['status'] | 'missing'): {
  label: string;
  color: string;
  bg: string;
} {
  if (status === 'success') return { label: '정상', color: '#166534', bg: '#dcfce7' };
  if (status === 'running') return { label: '실행중', color: '#92400e', bg: '#fef3c7' };
  if (status === 'failed') return { label: '실패', color: '#991b1b', bg: '#fee2e2' };
  if (status === 'skipped') return { label: '스킵', color: '#334155', bg: '#e2e8f0' };
  return { label: '미확인', color: '#334155', bg: '#e2e8f0' };
}

export default async function AdminPublishHubPage() {
  let botRows: BotActionLite[] = [];
  let healthNote: string | null = null;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('bot_actions')
      .select('bot_name,status,created_at,error_message')
      .in('bot_name', [...WATCH_BOTS])
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    botRows = (data ?? []) as BotActionLite[];
  } catch (e) {
    healthNote = e instanceof Error ? e.message : String(e);
  }

  const latest = latestByBot(botRows);
  const newsLlmReady = isNewsSummaryLlmConfigured();
  const knowledgeLlmReady = isKnowledgeLlmConfigured();
  const newsStubReady = stubOnLlmFailure();
  const knowledgeStubReady = stubKnowledgeOnLlmFailure();

  const cards = [
    { key: 'news_curator', label: '뉴스 수집', row: latest['news_curator'] },
    { key: 'news_summarizer', label: '뉴스 가공', row: latest['news_summarizer'] },
    { key: 'knowledge_curator_collect', label: '꿀정보 수집', row: latest['knowledge_curator_collect'] },
    { key: 'knowledge_curator_process', label: '꿀정보 가공', row: latest['knowledge_curator_process'] },
  ] as const;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px', fontWeight: 800 }}>최종 승인 · 배포</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
        봇이 가져온 뉴스와 태국 꿀팁은 기본적으로 <strong>초안(published=false)</strong>만 쌓입니다. 여기서 정리한 뒤 각 큐에서{' '}
        <strong>승인 한 번(또는 일괄 승인)</strong>으로 이용자 화면에 올라갑니다.
      </p>

      <section
        style={{
          marginBottom: 18,
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          padding: 14,
          background: '#f8fafc',
        }}
      >
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>파이프라인 헬스체크</h2>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {cards.map((c) => {
            const tone = statusTone(c.row?.status ?? 'missing');
            return (
              <article
                key={c.key}
                style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{c.label}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      color: tone.color,
                      background: tone.bg,
                    }}
                  >
                    {tone.label}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
                  {c.row ? `${minutesAgo(c.row.created_at)}분 전 실행` : '실행 기록 없음'}
                </p>
                {c.row?.error_message ? (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#991b1b' }}>{c.row.error_message}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          LLM 상태 — 뉴스: <strong>{newsLlmReady ? 'READY' : 'OFF'}</strong> / 꿀정보:{' '}
          <strong>{knowledgeLlmReady ? 'READY' : 'OFF'}</strong> · 스텁 fallback — 뉴스:{' '}
          <strong>{newsStubReady ? 'ON' : 'OFF'}</strong> / 꿀정보: <strong>{knowledgeStubReady ? 'ON' : 'OFF'}</strong>
        </p>
        {healthNote ? (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#991b1b' }}>헬스체크 조회 실패: {healthNote}</p>
        ) : null}
      </section>

      <TaejaEditorialTips />

      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          marginBottom: 28,
        }}
      >
        <Link
          href="/admin/news"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 12,
            border: '2px solid #4f46e5',
            background: '#eef2ff',
            textDecoration: 'none',
            color: '#312e81',
          }}
        >
          <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>뉴스 초안 큐 →</strong>
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            봇이 수집·요약한 기사. 제목·한글 요약(20자 이상)을 다듬은 뒤 «홈에 게시» 또는 «일괄 게시».
          </span>
        </Link>
        <Link
          href="/admin/knowledge"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 12,
            border: '2px solid #7c3aed',
            background: '#f5f3ff',
            textDecoration: 'none',
            color: '#4c1d95',
          }}
        >
          <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>지식·꿀팁 큐 →</strong>
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            태국 생활 정보. 스텁이면 LLM 재가공 후, 미리보기로 확인하고 «일괄 승인» 또는 건별 «최종 승인」.
          </span>
        </Link>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
        로컬 스팟·광장 일반 글은 각각 <Link href="/admin/local-spots">로컬 가게</Link>·
        <Link href="/admin/community-posts">광장 글</Link> 메뉴에서 승인합니다.
      </p>
    </div>
  );
}
