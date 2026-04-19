import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { absoluteUrl } from '@/lib/seo/site';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { formatDate } from '@/lib/utils/formatDate';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const title =
    locale === 'th' ? 'Thai Ja World ประเด็นร้อน' : '태자월드 핫 이슈';
  const description =
    locale === 'th'
      ? 'รวมประเด็นสำคัญล่าสุดสำหรับคนใช้ชีวิตในไทย'
      : '태국 생활에 바로 필요한 최신 핵심 이슈 모음';
  const url = absoluteUrl('/hot-issues');
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: d.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function HotIssuesPage() {
  const locale = await getLocale();
  const title =
    locale === 'th' ? 'Thai Ja World ประเด็นร้อน' : '태자월드 핫 이슈';
  const lead =
    locale === 'th'
      ? 'ข่าวและข้อมูลล่าสุดที่ควรรู้ตอนนี้ กดหัวข้อเพื่ออ่านสรุปและต้นทางได้ทันที'
      : '지금 꼭 확인해야 할 최신 이슈를 모았습니다. 제목을 누르면 요약·원문으로 바로 이동합니다.';
  const empty =
    locale === 'th'
      ? 'ตอนนี้ยังไม่มีประเด็นร้อนใหม่ ลองดูบอร์ดชุมชนก่อน'
      : '아직 새로운 핫 이슈가 없어요. 먼저 태자월드 게시판을 확인해 주세요.';
  const boardCta =
    locale === 'th'
      ? 'ไปบอร์ดชุมชน'
      : '태자월드 게시판으로 이동';

  const sb = await createServerSupabaseAuthClient();
  const { data: processed } = await sb
    .from('processed_news')
    .select(
      'id, clean_body, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(40);

  const rows = (processed ?? []).map((pn) => {
    const rn = (pn.raw_news as unknown) as {
      title: string;
      external_url: string;
      published_at: string | null;
    } | null;
    const sums = (pn.summaries as unknown) as
      | { summary_text: string; model: string | null }[]
      | null;
    const { title: t, summary_text } = titleAndSummaryFromProcessed(
      (pn.clean_body as string | null) ?? null,
      rn?.title ?? null,
      sums ?? null,
      locale,
    );
    return {
      id: String(pn.id),
      title: t,
      summary: summary_text?.trim() ?? '',
      externalUrl: rn?.external_url ?? '#',
      publishedAt: rn?.published_at ?? null,
    };
  });

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{title}</h1>
        <Link href="/community/boards?scope=general" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          {boardCta}
        </Link>
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{lead}</p>
      </div>
      {rows.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0 }}>{empty}</p>
        </div>
      ) : (
        rows.map((row) => (
          <article key={row.id} className="board-post" style={{ marginBottom: 10 }}>
            <Link href={`/news/${row.id}`} className="board-post__title" style={{ display: 'block' }}>
              {row.title}
            </Link>
            {row.summary ? <p className="board-post__excerpt">{row.summary}</p> : null}
            <div className="board-post__meta">
              {formatDate(row.publishedAt)} ·{' '}
              <a href={row.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                {locale === 'th' ? 'เปิดต้นทาง' : '원문 보기'}
              </a>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
