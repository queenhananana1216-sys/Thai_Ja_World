import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import {
  categoriesForScope,
  categoryLabel,
  parseBoardListCategoryParam,
  parseBoardScopeParam,
} from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { formatDate } from '@/lib/utils/formatDate';
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
  searchParams: Promise<{ cat?: string; scope?: string }>;
}) {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const catFilter = parseBoardListCategoryParam(
    typeof sp.cat === 'string' ? sp.cat : undefined,
  );
  const scope = parseBoardScopeParam(typeof sp.scope === 'string' ? sp.scope : undefined);
  const newPostHref = catFilter
    ? `/community/boards/new?cat=${catFilter}${scope ? `&scope=${scope}` : ''}`
    : `/community/boards/new${scope ? `?scope=${scope}` : ''}`;

  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  let query = supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls, author_hidden',
    )
    .eq('moderation_status', 'safe')
    .order('created_at', { ascending: false })
    .limit(80);

  if (catFilter) {
    query = query.eq('category', catFilter);
  } else {
    query = query.in('category', categoriesForScope(scope));
  }

  const { data: posts, error } = await query;

  const list = posts ?? [];
  const names = await profileNames(list.map((p) => p.author_id as string));

  const listTitle = catFilter
    ? categoryLabel(catFilter, locale)
    : scope === 'trade'
      ? d.board.tradeHubTitle
      : d.board.pageTitle;

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
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{listTitle}</h1>
        <Link href={newPostHref} className="board-form__submit" style={{ textAlign: 'center' }}>
          {d.board.newPost}
        </Link>
      </div>

      {error && (
        <p style={{ color: '#be185d', fontSize: '0.86rem' }}>
          게시글을 불러오지 못했습니다. posts.image_urls 컬럼과 RLS를 확인하세요. ({error.message})
        </p>
      )}

      {!error && list.length === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ margin: 0 }}>{d.board.empty}</p>
          <Link
            href={`/auth/signup?next=${encodeURIComponent(newPostHref)}`}
            style={{ display: 'inline-block', marginTop: 12, color: 'var(--tj-link)' }}
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
          <div key={pid} className="board-post-wrap">
            <Link href={`/community/boards/${pid}`} className="board-post" style={{ display: 'block' }}>
              <div className="board-post__meta">
                {cat} · {author} · {formatDate(p.created_at as string | null)} · {d.board.comments}{' '}
                {p.comment_count ?? 0} · {d.board.views} {p.view_count ?? 0} · 좋아요 {counts.like} · 공감{' '}
                {counts.heart}
                {authorHidden ? (
                  <>
                    {' '}
                    · <span style={{ color: '#7c6f94' }}>{d.board.postPrivateBadge}</span>
                  </>
                ) : null}
              </div>
              <h2 className="board-post__title">{p.title as string}</h2>
              <p className="board-post__excerpt">{excerpt}</p>
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="board-post__thumb" loading="lazy" />
              )}
            </Link>
            {isAuthor ? (
              <PostAuthorMenu
                postId={pid}
                authorHidden={authorHidden}
                listLayout
                labels={{
                  postOwnerMenu: d.board.postOwnerMenu,
                  postDelete: d.board.postDelete,
                  postMakePrivate: d.board.postMakePrivate,
                  postMakePublic: d.board.postMakePublic,
                  postDeleteConfirm: d.board.postDeleteConfirm,
                  postBusy: d.board.postBusy,
                  postActionError: d.board.postActionError,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
