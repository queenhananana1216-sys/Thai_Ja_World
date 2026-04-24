import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import {
  categoryLabel,
  parseBoardListCategoryParam,
  POST_CATEGORY_SLUGS,
} from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { formatDate } from '@/lib/utils/formatDate';
import { isCommunityPublicViewCountsEnabled } from '@/lib/community/publicViewCounts';
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

  const allCategories = POST_CATEGORY_SLUGS;
  const showViewCounts = isCommunityPublicViewCountsEnabled();

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
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{listTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">
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

      <div className="mb-5 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50/90 to-slate-50 p-4 text-sm text-slate-800 shadow-sm sm:p-5">
        <p className="m-0 font-semibold text-slate-900">
          {locale === 'th' ? 'ศูนย์กลางชุมชน' : '태국 사는 한국인 커뮤니티 허브'}
        </p>
        <p className="mt-1.5 m-0 leading-relaxed text-slate-600">
          {locale === 'th'
            ? 'ข่าว ทิป ร้าน กระดาน — ลิงก์สำคัญด้านล่าง'
            : '뉴스·꿀팁·로컬·광장·제보(사람 찾기/행불)까지 한 흐름으로 이어집니다. (조회수 공개는 트래픽 늘면 켤 예정)'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 no-underline hover:border-violet-400"
          >
            {locale === 'th' ? 'หน้าแรก' : '홈'}
          </Link>
          <Link
            href="/news"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 no-underline hover:border-violet-400"
          >
            {locale === 'th' ? 'ข่าว' : '뉴스'}
          </Link>
          <Link
            href="/tips"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 no-underline hover:border-violet-400"
          >
            {locale === 'th' ? 'เคล็ดลับ' : '꿀팁'}
          </Link>
          <Link
            href="/local"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 no-underline hover:border-violet-400"
          >
            {locale === 'th' ? 'ร้าน/ท้องถิ่น' : '로컬'}
          </Link>
          <Link
            href="/community/boards?cat=report_find"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 no-underline hover:border-amber-400"
          >
            {locale === 'th' ? 'รายงาน · ตามหา' : '제보 · 사람 찾기'}
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{locale === 'th' ? 'หมวด' : '말머리'}</span>
        <Link
          href="/community/boards"
          className={
            !catFilter
              ? 'rounded-full bg-slate-900 px-3 py-1 font-semibold text-white no-underline'
              : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 no-underline hover:border-violet-300'
          }
        >
          {locale === 'th' ? 'ทั้งหมด' : '전체'}
        </Link>
        {allCategories.map((c) => (
          <Link
            key={c}
            href={`/community/boards?cat=${c}`}
            className={
              catFilter === c
                ? 'rounded-full bg-violet-700 px-3 py-1 font-semibold text-white no-underline'
                : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 no-underline hover:border-violet-300'
            }
          >
            {categoryLabel(c, locale)}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          게시글을 불러오지 못했습니다. posts.image_urls 컬럼과 RLS를 확인하세요. ({error.message})
        </p>
      )}

      {!error && list.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="m-0 text-slate-700">{d.board.empty}</p>
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
        const thumb = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
        const excerpt = String(p.content ?? '').replace(/\s+/g, ' ').slice(0, 140);
        const cat = categoryLabel(String(p.category), locale);
        const author = names[p.author_id as string] ?? '…';

        const isAuthor = viewerId !== null && viewerId === (p.author_id as string);
        const authorHidden = Boolean(p.author_hidden);

        return (
          <article key={pid} className="mb-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md">
            <Link href={`/community/boards/${pid}`} className="block no-underline hover:no-underline">
              <div className="break-words text-xs font-medium leading-relaxed text-slate-500">
                {cat} · {author} · {formatDate(p.created_at as string | null)} · {d.board.comments}{' '}
                {p.comment_count ?? 0}
                {showViewCounts ? (
                  <>
                    {' '}
                    · {d.board.views} {p.view_count ?? 0}
                  </>
                ) : null}
                {' '}
                · 좋아요 {counts.like} · 공감 {counts.heart}
                {authorHidden ? (
                  <>
                    {' '}
                    · <span className="font-semibold text-violet-700">{d.board.postPrivateBadge}</span>
                  </>
                ) : null}
              </div>
              <h2 className="mt-2 text-lg font-extrabold text-slate-900">{p.title as string}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{excerpt}</p>
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="mt-3 h-40 w-full rounded-xl object-cover" loading="lazy" />
              )}
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
    </main>
  );
}
