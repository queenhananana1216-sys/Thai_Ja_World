/**
 * 뉴스 초안 큐 — 기본(manual·미설정)은 LLM 결과를 초안만 저장, 승인 후 게시
 */
import Link from 'next/link';
import NewsQueueClient, { type NewsQueueDiagnostics, type QueueItem } from './_components/NewsQueueClient';
import { isNewsSummaryLlmConfigured } from '@/bots/actions/summarizeAndPersistNews';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';
import { createServiceRoleClient } from '@/lib/supabase/admin';

function mondayLabelKst(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.getFullYear(), d.getMonth(), diff);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd} (월요일 주간)`;
}

export default async function AdminNewsQueuePage() {
  const admin = createServiceRoleClient();
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  let diagnostics: NewsQueueDiagnostics | null = null;
  try {
    const [dDraft, dPub, dRaw] = await Promise.all([
      admin.from('processed_news').select('id', { count: 'exact', head: true }).eq('published', false),
      admin.from('processed_news').select('id', { count: 'exact', head: true }).eq('published', true),
      admin.from('raw_news').select('id', { count: 'exact', head: true }).gte('fetched_at', since14d),
    ]);
    diagnostics = {
      draftCount: dDraft.count ?? 0,
      publishedCount: dPub.count ?? 0,
      rawNewsRecentCount: dRaw.count ?? 0,
      newsModeAuto: newsInsertAsPublished(),
    };
  } catch {
    diagnostics = null;
  }

  let orphanRawNews: Array<{
    id: string;
    title: string;
    external_url: string | null;
    fetched_at: string;
  }> = [];
  try {
    const { data: linked } = await admin.from('processed_news').select('raw_news_id');
    const done = new Set((linked ?? []).map((r) => String(r.raw_news_id)));
    const { data: raws } = await admin
      .from('raw_news')
      .select('id, title, external_url, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(120);
    orphanRawNews = (raws ?? [])
      .filter((r) => !done.has(String(r.id)))
      .slice(0, 80)
      .map((r) => ({
        id: String(r.id),
        title: ((r.title as string) ?? '').trim() || '(제목 없음)',
        external_url: (r.external_url as string | null) ?? null,
        fetched_at: String(r.fetched_at ?? ''),
      }));
  } catch {
    orphanRawNews = [];
  }

  const { data: rows, error } = await admin
    .from('processed_news')
    .select(
      'id, clean_body, created_at, raw_news(title, external_url), summaries(summary_text, model)',
    )
    .eq('published', false)
    .order('created_at', { ascending: false })
    .limit(200);

  const items: QueueItem[] = [];
  for (const r of rows ?? []) {
    const rn = r.raw_news as unknown as { title: string; external_url: string } | null;
    const sums = r.summaries as unknown as { summary_text: string; model: string | null }[] | null;
    const rawTitle = rn?.title?.trim() || '(제목 없음)';
    const rawUrl = rn?.external_url?.trim() || '#';
    const ko = titleAndSummaryFromProcessed(
      r.clean_body as string | null,
      rawTitle,
      sums ?? null,
      'ko',
    );
    const th = titleAndSummaryFromProcessed(
      r.clean_body as string | null,
      rawTitle,
      sums ?? null,
      'th',
    );
    const created = r.created_at as string;
    items.push({
      id: r.id as string,
      created_at: created,
      week_label: mondayLabelKst(created),
      raw_title: rawTitle,
      raw_url: rawUrl,
      ko_title: ko.title,
      ko_summary: ko.summary_text ?? '',
      th_title: th.title,
      th_summary: th.summary_text ?? '',
      clean_body: (r.clean_body as string | null) ?? null,
      summaries: sums ?? null,
    });
  }

  const llmReady = isNewsSummaryLlmConfigured();

  return (
    <div className="admin-page-narrow" style={{ padding: '20px 24px', maxWidth: 920, margin: '0 auto' }}>
      <h1 className="admin-dash__title" style={{ fontSize: '1.25rem' }}>
        뉴스 큐
      </h1>
      <p className="admin-dash__lead" style={{ maxWidth: '58ch' }}>
        데스크 AI가 쓴 <strong>제목·3줄·대비책</strong>을 카드로 확인한 뒤 <strong>게시하기</strong>만 누르세요. 손으로 고치려면{' '}
        「상세 편집」을 여세요.{' '}
        <Link href="/admin/publish" style={{ color: 'var(--admin-link)' }}>
          승인 허브 →
        </Link>
        {llmReady ? '' : ' · LLM 미설정이면 AI 버튼이 비활성입니다.'}
      </p>
      {error ? (
        <p style={{ color: '#b91c1c', marginTop: 16 }}>
          DB 오류: {error.message} — <code>009_processed_news_published.sql</code> 마이그레이션 적용 여부를 확인하세요.
        </p>
      ) : (
        <NewsQueueClient
          items={items}
          diagnostics={diagnostics}
          orphanRawNews={orphanRawNews}
          llmReady={llmReady}
        />
      )}
    </div>
  );
}
