import Link from 'next/link';
import { Suspense } from 'react';
import NewPostForm from '../_components/NewPostForm';
import {
  categoriesForScope,
  isCategoryAllowedInScope,
  parseBoardScopeParam,
  parseNewPostCategoryParam,
} from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export default async function NewBoardPostPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; scope?: string }>;
}) {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const scope = parseBoardScopeParam(typeof sp.scope === 'string' ? sp.scope : undefined);
  const requestedCategory = parseNewPostCategoryParam(
    typeof sp.cat === 'string' ? sp.cat : undefined,
  );
  const fallbackCategory = categoriesForScope(scope)[0] ?? 'free';
  const defaultCategory =
    requestedCategory && isCategoryAllowedInScope(requestedCategory, scope)
      ? requestedCategory
      : fallbackCategory;
  const backHref = scope ? `/community/boards?scope=${scope}` : '/community/boards';

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{d.board.newPost}</h1>
        <Link href={backHref} style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          {d.board.backToList}
        </Link>
      </div>
      <Suspense fallback={<p>…</p>}>
        <NewPostForm
          locale={locale}
          board={d.board}
          defaultCategory={defaultCategory}
          scope={scope}
        />
      </Suspense>
    </div>
  );
}
