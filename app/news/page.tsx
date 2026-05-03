import Link from 'next/link';
import type { Metadata } from 'next';
import KoreanNewsPipelineNotice from '../_components/news/KoreanNewsPipelineNotice';
import portalStyles from '../portal/portal-2026.module.css';
import NewsHubArticleList from './_components/NewsHubArticleList';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import {
  listTitleSummaryFromProcessedNoRaw,
  newsDetailFromProcessed,
  passesKoPublicGate,
} from '@/lib/news/processedNewsDisplay';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NEWS_HUB_LIMIT = 100;
const NEWS_HUB_FETCH_CAP = 320;

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    title: d.home.newsTitle,
    description: d.home.newsSub,
    robots: { index: true, follow: true },
  };
}

export default async function NewsHubPage() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const h = d.home;
  const locUi = locale === 'th' ? 'th' : 'ko';

  let isLoggedIn = false;
  try {
    const authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await authSb.auth.getUser();
    isLoggedIn = Boolean(user?.id);
  } catch {
    isLoggedIn = false;
  }

  const sb = createServerClient();
  const { data: processed, error: procErr } = await sb
    .from('processed_news')
    .select('id, clean_body, language, created_at, summaries(summary_text, model)')
    .eq('published', true)
    .eq('language', 'ko')
    .order('created_at', { ascending: false })
    .limit(NEWS_HUB_FETCH_CAP);

  const sourceRows = procErr || !processed ? [] : processed;
  const rows =
    sourceRows
      .filter((pn) =>
        passesKoPublicGate(
          pn.language as string | null,
          (pn.clean_body as string | null) ?? null,
          pn.summaries as { summary_text: string; model: string | null }[] | null,
        ),
      )
      .map((pn) => {
        const sums = pn.summaries as unknown as
          | { summary_text: string; model: string | null }[]
          | null;
        const parsed = listTitleSummaryFromProcessedNoRaw(
          (pn.clean_body as string | null) ?? null,
          sums ?? null,
          locUi,
        );
        if (!parsed?.title?.trim()) return null;

        const detail = newsDetailFromProcessed(
          (pn.clean_body as string | null) ?? null,
          null,
          null,
          sums ?? null,
          locUi,
          { allowRawTitleFallback: false },
        );
        const externalUrl = detail.sourceUrl?.trim() || '#';
        const publishedAt = (pn.created_at as string | null) ?? null;

        return {
          id: String(pn.id),
          title: parsed.title.trim(),
          summary_text: (parsed.summary_text ?? '').trim(),
          external_url: externalUrl,
          published_at: publishedAt,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .slice(0, NEWS_HUB_LIMIT) ?? [];

  return (
    <div className={portalStyles.root}>
      <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-4 md:py-8">
        <header className={`${portalStyles.glassGold} mb-4 px-4 py-3 sm:px-5`}>
          <h1 className="m-0 text-xl font-black tracking-tight text-white sm:text-2xl">{h.newsTitle}</h1>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-slate-200">{h.newsSub}</p>
        </header>

        <section className={`${portalStyles.glassBlue} mb-4 px-4 py-3 text-sm leading-relaxed text-slate-200`}>
          뉴스 게시글 작성은 관리자 전용입니다. 회원은 댓글과 반응으로 참여할 수 있습니다.
        </section>

        <p className="mb-6 text-sm font-semibold">
          <Link href="/tips" className="text-amber-200 underline-offset-2 hover:text-amber-100 hover:underline">
            {h.newsHubCrossLinkTips}
          </Link>
        </p>

        {procErr ? (
          <p className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-indigo-950/70 to-slate-950/80 px-4 py-3 text-sm text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
            {procErr.message}
          </p>
        ) : null}

        {!procErr && rows.length === 0 ? (
          <KoreanNewsPipelineNotice className="mb-8" />
        ) : null}

        {!procErr && rows.length > 0 ? (
          <p className="mb-4 text-sm text-slate-300">{h.newsHubListingNote.replace('{n}', String(rows.length))}</p>
        ) : null}

        <NewsHubArticleList rows={rows} isLoggedIn={isLoggedIn} openDetailLabel={h.newsHubOpenDetail} />
      </div>
    </div>
  );
}
