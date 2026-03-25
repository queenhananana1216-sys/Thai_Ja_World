import type { Dictionary } from '@/i18n/dictionaries';

/** API JSON `code` → 사용자 언어 안내 */
export function boardModMessage(board: Dictionary['board'], code: string | undefined): string {
  const m = board.mod;
  switch (code) {
    case 'nsfw':
      return m.nsfw;
    case 'promo':
      return m.promo;
    case 'banned':
      return m.banned;
    case 'imagePolicy':
      return m.imagePolicy;
    case 'scam':
      return m.scam;
    case 'server':
      return m.server;
    case 'auth':
      return m.auth;
    case 'invalid':
      return m.generic;
    default:
      return m.generic;
  }
}
