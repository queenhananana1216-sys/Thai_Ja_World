import { DEFAULT_SITE_DISPLAY_NAME } from './constants';

/** 클라이언트·빌드 타임 — DB 없이 env만 (NEXT_PUBLIC_SITE_NAME) */
export function getClientSiteDisplayName(): string {
  const v = process.env.NEXT_PUBLIC_SITE_NAME?.trim();
  return v || DEFAULT_SITE_DISPLAY_NAME;
}
