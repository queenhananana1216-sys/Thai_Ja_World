/**
 * 뉴스 초안 큐 — 기본(manual·미설정)은 LLM 결과를 초안만 저장, 승인 후 게시
 */
import Link from 'next/link';
import NewsQueueClient, { type NewsQueueDiagnostics, type QueueItem } from './_components/NewsQueueClient';
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

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>뉴스 초안 큐</h1>
      <p style={{ margin: '0 0 12px', fontSize: 12 }}>
        <Link href="/admin/publish" style={{ color: '#2563eb', fontWeight: 600 }}>
          최종 승인·태자 편집 팁(한 페이지 요약) →
        </Link>
      </p>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
        <strong>기본:</strong> 봇이 수집·요약한 기사는 <strong>미게시 초안</strong>(<code>published=false</code>)으로만
        저장됩니다. 아래에서 한·태 제목·요약을 고친 뒤 <strong>홈에 게시</strong>를 누르면 홈·뉴스 상세에
        올라갑니다. 올리지 않을 기사는 <strong>삭제(올리지 않음)</strong>으로 원문·요약·댓글을 함께 지울 수
        있습니다.
        <br />
        <br />
        <strong>예전처럼 저장 즉시 공개</strong>하려면 배포 환경에만 <code>NEWS_PUBLISH_MODE=auto</code> 를 넣으면
        됩니다. (변수를 비우면 다시 승인 큐 방식입니다.)
        <br />
        <br />
        큐가 계속 비어 있으면 뉴스 크론·LLM 키·봇 기록(<code>/admin/bot-actions</code>)을 확인해 보세요. Vercel Cron은{' '}
        <code>vercel.json</code> 기준 하루 2회(UTC) 수집+요약입니다.
        <br />
        <br />
        <strong>SQL만 실행했는데 비어 있나요?</strong> 이 화면은 <code>processed_news</code> 중{' '}
        <code>published=false</code> 인 행만 보여 줍니다. 원문만 <code>raw_news</code>에 있으면 봇이 요약해{' '}
        <code>processed_news</code>를 만들어야 하고,         예전에 이미 <code>published=true</code> 로 들어간 기사는
        아래 «승인 대기로 옮기기»로 되돌릴 수 있어요. 원문만 쌓여 있으면 «승인 큐에 올리기»로 스텁 초안을 만들 수 있습니다.
      </p>
      {error ? (
        <p style={{ color: '#b91c1c', marginTop: 16 }}>
          DB 오류: {error.message} — <code>009_processed_news_published.sql</code> 마이그레이션 적용 여부를 확인하세요.
        </p>
      ) : (
        <NewsQueueClient items={items} diagnostics={diagnostics} orphanRawNews={orphanRawNews} />
      )}
    </div>
  );
}
