import type { Locale } from '@/i18n/types';

export type PostCategorySlug = 'free' | 'restaurant' | 'info' | 'flea' | 'job';

export const POST_CATEGORY_SLUGS: PostCategorySlug[] = [
  'free',
  'restaurant',
  'info',
  'flea',
  'job',
];

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

export function categoryOptionsForPosting(locale: Locale) {
  return POST_CATEGORY_SLUGS.filter((value) => !POST_CATEGORY_POSTING_DISABLED.has(value)).map(
    (value) => ({
      value,
      label: labels[value][locale === 'th' ? 'th' : 'ko'],
    }),
  );
}

export function parseBoardListCategoryParam(raw: string | undefined): PostCategorySlug | null {
  if (raw === 'flea' || raw === 'job') return raw;
  return null;
}

/** /community/boards/new?cat=… 쿼리 (허용된 말머리만) */
export function parseNewPostCategoryParam(raw: string | undefined): PostCategorySlug | null {
  if (POST_CATEGORY_SLUGS.includes(raw as PostCategorySlug)) return raw as PostCategorySlug;
  return null;
}
