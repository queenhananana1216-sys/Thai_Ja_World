/**
 * 뉴스 초안 큐 — NEWS_PUBLISH_MODE=manual 일 때 LLM 결과를 주 단위로 검토·게시
 */
import NewsQueueClient, { type QueueItem } from './_components/NewsQueueClient';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
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
    });
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>뉴스 초안 큐</h1>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
        봇이 수집·요약한 기사는 <code>NEWS_PUBLISH_MODE=manual</code> 일 때 여기(초안)에만 쌓입니다. 한·태 제목·요약을
        고친 뒤 <strong>홈에 게시</strong>하면 홈·뉴스 상세에 노출됩니다. 올리지 않을 기사는{' '}
        <strong>삭제(올리지 않음)</strong>으로 원문·요약·댓글을 DB에서 함께 제거할 수 있습니다.
        <br />
        Vercel Cron은 매일 한국 이른 아침(약 06시) 전후에 수집+요약을 한 번 돌리도록 설정되어 있습니다(
        <code>vercel.json</code>·UTC 기준).
      </p>
      {error ? (
        <p style={{ color: '#b91c1c', marginTop: 16 }}>
          DB 오류: {error.message} — <code>009_processed_news_published.sql</code> 마이그레이션 적용 여부를 확인하세요.
        </p>
      ) : (
        <NewsQueueClient items={items} />
      )}
    </div>
  );
}
