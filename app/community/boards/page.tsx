import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import {
  categoryLabel,
  parseBoardListCategoryParam,
} from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { formatDate } from '@/lib/utils/formatDate';
import { getPerceivedViewCount } from '@/lib/utils';
import { absoluteUrl } from '@/lib/seo/site';
import PostAuthorMenu from './_components/PostAuthorMenu';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const title = d.board.pageTitle;
  const description = d.seo.boardsListDescription;
  const url = absoluteUrl('/community/boards');
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

async function profileNames(ids: string[]): Promise<Record<string, string>> {
  const u = [...new Set(ids)];
  if (u.length === 0) return {};
  const supabase = await createServerSupabaseAuthClient();
  const { data } = await supabase.from('profiles').select('id, display_name').in('id', u);
  const d: Record<string, string> = {};
  for (const row of data ?? []) {
    d[row.id] = (row.display_name as string) || 'member';
  }
  return d;
}

export default async function BoardsListPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const catFilter = parseBoardListCategoryParam(
    typeof sp.cat === 'string' ? sp.cat : undefined,
  );
  const newPostHref = catFilter
    ? `/community/boards/new?cat=${catFilter}`
    : '/community/boards/new';

  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  let query = supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls, author_hidden, owner_edit_password_set',
    )
    .eq('moderation_status', 'safe')
    .eq('is_knowledge_tip', false)
    .order('created_at', { ascending: false })
    .limit(80);

  if (catFilter) {
    query = query.eq('category', catFilter);
  }

  const { data: posts, error } = await query;

  const list = posts ?? [];
  const names = await profileNames(list.map((p) => p.author_id as string));

  const listTitle = catFilter ? categoryLabel(catFilter, locale) : d.board.pageTitle;

  // 리액션 카운트(좋아요/공감) — 목록에는 버튼 없이 숫자만 표시
  const postIds = (list ?? []).map((p) => String(p.id));
  const countsByPostId: Record<string, { like: number; heart: number }> = {};
  if (postIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from('post_reactions')
      .select('post_id, kind')
      .in('post_id', postIds);

    for (const r of reactionRows ?? []) {
      const pid = String(r.post_id);
      const kind = String(r.kind);
      const cur = countsByPostId[pid] ?? { like: 0, heart: 0 };
      if (kind === 'like') cur.like += 1;
      if (kind === 'heart') cur.heart += 1;
      countsByPostId[pid] = cur;
    }
  }

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-8">
      <div className="mb-6 rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-[0_14px_38px_rgba(2,6,23,0.45)] backdrop-blur-md sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{listTitle}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {locale === 'th'
                ? 'บอร์ดชุมชนที่เก็บข้อมูลแบบค้นหาได้ เพื่อไม่ให้โพสต์ดี ๆ หายไปในแชต'
                : '정보 글이 묻히지 않도록 구조화해서 저장되는 커뮤니티 보드입니다.'}
            </p>
          </div>
          <Link
            href={newPostHref}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-slate-700"
          >
            {d.board.newPost}
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-slate-600/40 bg-slate-900/45 px-4 py-4 text-center shadow-[0_14px_30px_rgba(2,6,23,0.38)] backdrop-blur-md">
          <p className="m-0 text-sm font-medium text-slate-200">아직 등록된 글이 없습니다. 첫 글의 주인공이 되어보세요!</p>
        </div>
      )}

      {!error && list.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8">
          <p className="m-0 text-slate-300">{d.board.empty}</p>
          <Link
            href={`/auth/signup?next=${encodeURIComponent(newPostHref)}`}
            className="mt-3 inline-block text-sm font-semibold text-violet-700 no-underline hover:underline"
          >
            {d.board.signup} →
          </Link>
        </div>
      )}

      {list.map((p) => {
        const pid = p.id as string;
        const counts = countsByPostId[String(pid)] ?? { like: 0, heart: 0 };
        const cat = categoryLabel(String(p.category), locale);
        const author = names[p.author_id as string] ?? '…';

        const isAuthor = viewerId !== null && viewerId === (p.author_id as string);
        const authorHidden = Boolean(p.author_hidden);

        return (
          <article key={pid} className="mb-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.35)] transition hover:bg-slate-800/50">
            <Link href={`/community/boards/${pid}`} className="block no-underline hover:no-underline">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate text-sm font-semibold text-slate-100">{p.title as string}</span>
                <span className="shrink-0">{d.board.comments} {p.comment_count ?? 0}</span>
                <span className="shrink-0">{formatDate(p.created_at as string | null)}</span>
                {authorHidden ? (
                  <>
                    {' '}
                    · <span className="font-semibold text-violet-700">{d.board.postPrivateBadge}</span>
                  </>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">
                {cat} · {author} · 👀{' '}
                {getPerceivedViewCount(Number(p.view_count ?? 0), pid).toLocaleString(locale === 'th' ? 'th-TH' : 'ko-KR')} ·
                좋아요 {counts.like} · 공감 {counts.heart}
              </p>
            </Link>
            {isAuthor ? (
              <div className="mt-3">
                <PostAuthorMenu
                  postId={pid}
                  authorHidden={authorHidden}
                  ownerGateSet={Boolean((p as { owner_edit_password_set?: boolean }).owner_edit_password_set)}
                  listLayout
                  labels={{
                    postOwnerMenu: d.board.postOwnerMenu,
                    postDelete: d.board.postDelete,
                    postMakePrivate: d.board.postMakePrivate,
                    postMakePublic: d.board.postMakePublic,
                    postDeleteConfirm: d.board.postDeleteConfirm,
                    postBusy: d.board.postBusy,
                    postActionError: d.board.postActionError,
                    postEdit: d.board.postEdit,
                    postOwnerPasswordPrompt: d.board.postOwnerPasswordPrompt,
                    postOwnerPasswordPlaceholder: d.board.postOwnerPasswordPlaceholder,
                    postOwnerPasswordSubmit: d.board.postOwnerPasswordSubmit,
                    postOwnerPasswordCancel: d.board.postOwnerPasswordCancel,
                    postOwnerPasswordRequired: d.board.postOwnerPasswordRequired,
                    postOwnerPasswordWrong: d.board.postOwnerPasswordWrong,
                  }}
                />
              </div>
            ) : null}
          </article>
        );
      })}

      <div className="mt-6 flex justify-center">
        <Link
          href={newPostHref}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-slate-700"
        >
          ✎ {d.board.newPost}
        </Link>
      </div>
    </main>
  );
}
