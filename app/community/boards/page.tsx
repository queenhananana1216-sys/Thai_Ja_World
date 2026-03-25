import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import {
  categoryLabel,
  parseBoardListCategoryParam,
} from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { formatDate } from '@/lib/utils/formatDate';

async function profileNames(ids: string[]): Promise<Record<string, string>> {
  const u = [...new Set(ids)];
  if (u.length === 0) return {};
  const supabase = createServerClient();
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
  const newPostHref =
    catFilter === 'flea' || catFilter === 'job'
      ? `/community/boards/new?cat=${catFilter}`
      : '/community/boards/new';

  const supabase = createServerClient();
  let query = supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls',
    )
    .eq('moderation_status', 'safe')
    .order('created_at', { ascending: false })
    .limit(80);

  if (catFilter) {
    query = query.eq('category', catFilter);
  }

  const { data: posts, error } = await query;

  const list = posts ?? [];
  const names = await profileNames(list.map((p) => p.author_id as string));

  const listTitle = catFilter ? categoryLabel(catFilter, locale) : d.board.pageTitle;

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
        const thumb = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
        const excerpt = String(p.content ?? '').replace(/\s+/g, ' ').slice(0, 140);
        const cat = categoryLabel(String(p.category), locale);
        const author = names[p.author_id as string] ?? '…';

        return (
          <Link key={pid} href={`/community/boards/${pid}`} className="board-post" style={{ display: 'block' }}>
            <div className="board-post__meta">
              {cat} · {author} · {formatDate(p.created_at as string | null)} · {d.board.comments}{' '}
              {p.comment_count ?? 0} · {d.board.views} {p.view_count ?? 0}
            </div>
            <h2 className="board-post__title">{p.title as string}</h2>
            <p className="board-post__excerpt">{excerpt}</p>
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="board-post__thumb" loading="lazy" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
