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
        자동 번역·요약만 된 기사는 여기에 쌓입니다. 한·태 제목·요약을 손보고{' '}
        <strong>홈에 게시</strong>를 누르면 홈·뉴스 상세에 노출됩니다.
        <br />
        배치 예: 매일 <code>news-pipeline</code>에 <code>skipProcess: true</code>로 수집만 → 주 1~2회{' '}
        <code>process-news</code>로 번역 적재 → 이 화면에서 일주일치를 나눠 게시.
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
