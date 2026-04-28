import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ view?: string }>;
};

type LocalBusinessRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  description: string | null;
  is_recommended: boolean;
  updated_at: string;
};

type PostRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
};

const POST_CAT_ALIAS: Record<string, string> = {
  free: 'free',
  qna: 'qna',
  info: 'info',
  realestate: 'info',
  'real-estate': 'info',
  flea: 'flea',
  market: 'flea',
  job: 'job',
  jobs: 'job',
  restaurant: 'restaurant',
};

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function toBoardCategory(category: string): string | null {
  return POST_CAT_ALIAS[normalizeCategory(category)] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `${category} | 로컬 인텔`,
    description: `${category} 카테고리의 로컬 업체와 게시글을 한 화면에서 확인합니다.`,
  };
}

async function fetchLocalBusinesses(category: string): Promise<LocalBusinessRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('local_businesses')
    .select('id,slug,name,category,region,description,is_recommended,updated_at')
    .eq('is_active', true)
    .ilike('category', category)
    .order('is_recommended', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(80);
  return (data ?? []) as LocalBusinessRow[];
}

async function fetchCategoryPosts(category: string): Promise<PostRow[]> {
  const boardCategory = toBoardCategory(category);
  if (!boardCategory) return [];
  const supabase = createServerClient();
  const { data } = await supabase
    .from('posts')
    .select('id,title,category,created_at,view_count,comment_count')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .eq('is_knowledge_tip', false)
    .eq('category', boardCategory)
    .order('created_at', { ascending: false })
    .limit(80);
  return (data ?? []) as PostRow[];
}

export default async function LocalCategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const { view } = await searchParams;
  const normalizedCategory = normalizeCategory(category);
  const asGrid = view === 'grid';

  const [businesses, posts] = await Promise.all([
    fetchLocalBusinesses(normalizedCategory),
    fetchCategoryPosts(normalizedCategory),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1320px] px-2 py-2 sm:px-3">
      <section className="rounded-xl border border-white/10 bg-slate-900/70 p-2 shadow-[0_12px_34px_rgba(2,6,23,0.42)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-black tracking-tight text-slate-100 sm:text-base">
            {normalizedCategory} 카테고리
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/local/${encodeURIComponent(normalizedCategory)}?view=list`}
              className="rounded-md border border-slate-600/60 px-2 py-1 text-[11px] font-semibold text-slate-200 no-underline"
            >
              List
            </Link>
            <Link
              href={`/local/${encodeURIComponent(normalizedCategory)}?view=grid`}
              className="rounded-md border border-slate-600/60 px-2 py-1 text-[11px] font-semibold text-slate-200 no-underline"
            >
              Grid
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-2 rounded-xl border border-white/10 bg-slate-900/65 p-2">
        <h2 className="mb-1 text-xs font-extrabold text-amber-200">로컬 업체</h2>
        {businesses.length === 0 ? (
          <p className="text-xs text-slate-400">등록된 로컬 업체가 없습니다.</p>
        ) : (
          <div className={asGrid ? 'grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-1'}>
            {businesses.map((biz) => (
              <Link
                key={biz.id}
                href={`/shop/${biz.slug}`}
                className="rounded-lg border border-white/10 bg-slate-800/70 p-2 no-underline transition hover:bg-slate-700/80"
              >
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{biz.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">
                  {biz.category} · {biz.region}
                </div>
                {biz.description ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-300 line-clamp-2">{biz.description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-2 rounded-xl border border-white/10 bg-slate-900/65 p-2">
        <h2 className="mb-1 text-xs font-extrabold text-cyan-200">게시글</h2>
        {posts.length === 0 ? (
          <p className="text-xs text-slate-400">연결된 게시글이 없습니다.</p>
        ) : (
          <div className={asGrid ? 'grid grid-cols-1 gap-1 sm:grid-cols-2' : 'flex flex-col gap-1'}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/boards/${post.id}`}
                className="rounded-lg border border-white/10 bg-slate-800/70 p-2 no-underline transition hover:bg-slate-700/80"
              >
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{post.title}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  조회 {post.view_count} · 댓글 {post.comment_count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
