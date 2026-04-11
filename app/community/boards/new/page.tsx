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
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{d.board.newPost}</h1>
        <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          {d.board.backToList}
        </Link>
      </div>
      <Suspense fallback={<p>…</p>}>
        <NewPostForm locale={locale} board={d.board} defaultCategory={defaultCategory} />
      </Suspense>
    </div>
  );
}
