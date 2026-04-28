import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import NewPostForm from '../_components/NewPostForm';
import { parseNewPostCategoryParam } from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function NewBoardPostPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const defaultCategory = parseNewPostCategoryParam(
    typeof sp.cat === 'string' ? sp.cat : undefined,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-[0_14px_38px_rgba(2,6,23,0.45)] backdrop-blur-md sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-white">{d.board.newPost}</h1>
          <Link href="/community/boards" className="text-sm font-semibold text-violet-200 no-underline hover:underline">
            {d.board.backToList}
          </Link>
        </div>
        <p className="mb-5 text-sm text-slate-300">
          카테고리 선택 후 제목/본문/사진을 입력하면 바로 게시됩니다.
        </p>
        <Suspense fallback={<p className="text-sm text-slate-400">…</p>}>
          <NewPostForm locale={locale} board={d.board} defaultCategory={defaultCategory} />
        </Suspense>
      </div>
    </main>
  );
}
