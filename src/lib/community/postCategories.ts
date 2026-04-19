import type { Locale } from '@/i18n/types';

export type PostCategorySlug = 'free' | 'restaurant' | 'info' | 'flea' | 'job';
export type BoardScope = 'general' | 'trade';

export const POST_CATEGORY_SLUGS: PostCategorySlug[] = [
  'free',
  'restaurant',
  'info',
  'flea',
  'job',
];

export const GENERAL_POST_CATEGORY_SLUGS: PostCategorySlug[] = ['free', 'restaurant', 'info'];
export const TRADE_POST_CATEGORY_SLUGS: PostCategorySlug[] = ['flea', 'job'];

/** 글쓰기에서 제외할 말머리(비우면 전부 허용) */
export const POST_CATEGORY_POSTING_DISABLED = new Set<PostCategorySlug>();

export function isPostingDisabledCategory(slug: string): boolean {
  return POST_CATEGORY_POSTING_DISABLED.has(slug as PostCategorySlug);
}

const labels: Record<
  PostCategorySlug,
  { ko: string; th: string }
> = {
  free: { ko: '자유', th: 'ทั่วไป' },
  restaurant: { ko: '맛집', th: 'ร้านแนะนำ' },
  info: { ko: '정보', th: 'ข้อมูล' },
  flea: { ko: '중고·거래', th: 'มือสอง' },
  job: { ko: '알바·구인', th: 'งาน·จ้าง' },
};

export function categoryLabel(slug: string, locale: Locale): string {
  const s = slug as PostCategorySlug;
  if (labels[s]) return locale === 'th' ? labels[s].th : labels[s].ko;
  return slug;
}

export function categoryOptions(locale: Locale) {
  return POST_CATEGORY_SLUGS.map((value) => ({
    value,
    label: labels[value][locale === 'th' ? 'th' : 'ko'],
  }));
}

function mapOptions(locale: Locale, categories: PostCategorySlug[]) {
  return categories.map((value) => ({
    value,
    label: labels[value][locale === 'th' ? 'th' : 'ko'],
  }));
}

export function categoryOptionsForPosting(locale: Locale) {
  return mapOptions(
    locale,
    POST_CATEGORY_SLUGS.filter((value) => !POST_CATEGORY_POSTING_DISABLED.has(value)),
  );
}

export function categoriesForScope(scope: BoardScope | null): PostCategorySlug[] {
  if (scope === 'trade') {
    return TRADE_POST_CATEGORY_SLUGS;
  }
  return GENERAL_POST_CATEGORY_SLUGS;
}

export function categoryOptionsForPostingByScope(locale: Locale, scope: BoardScope | null) {
  const allowed = categoriesForScope(scope).filter((value) => !POST_CATEGORY_POSTING_DISABLED.has(value));
  return mapOptions(locale, allowed);
}

/** 목록 URL ?cat= — 사이트 검색·말머리와 동일하게 전 카테고리 허용 */
export function parseBoardListCategoryParam(raw: string | undefined): PostCategorySlug | null {
  if (!raw) return null;
  return POST_CATEGORY_SLUGS.includes(raw as PostCategorySlug) ? (raw as PostCategorySlug) : null;
}

export function parseBoardScopeParam(raw: string | undefined): BoardScope | null {
  if (raw === 'trade') return 'trade';
  if (raw === 'general') return 'general';
  return null;
}

/** /community/boards/new?cat=… 쿼리 (허용된 말머리만) */
export function parseNewPostCategoryParam(raw: string | undefined): PostCategorySlug | null {
  if (POST_CATEGORY_SLUGS.includes(raw as PostCategorySlug)) return raw as PostCategorySlug;
  return null;
}

export function isCategoryAllowedInScope(
  category: string,
  scope: BoardScope | null,
): category is PostCategorySlug {
  return categoriesForScope(scope).includes(category as PostCategorySlug);
}
