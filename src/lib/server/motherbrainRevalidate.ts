import 'server-only';

import { revalidatePath } from 'next/cache';

/** 전역 에러·UI 순찰과 맞춘 주요 공개 라우트 ISR 무효화 */
export const MOTHERBRAIN_REVALIDATE_PATHS = [
  '/',
  '/tips',
  '/news',
  '/local/demo',
  '/korean-biz',
  '/hub',
  '/community/boards',
] as const;

export function revalidateMotherbrainPaths(pathnameHint?: string | null): number {
  const paths = new Set<string>(MOTHERBRAIN_REVALIDATE_PATHS);
  const raw = pathnameHint?.trim();
  if (raw?.startsWith('/')) {
    paths.add(raw.split('?')[0] ?? raw);
  }
  for (const p of paths) {
    revalidatePath(p);
  }
  return paths.size;
}
