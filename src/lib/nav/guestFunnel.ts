/**
 * 비회원 퍼널: 허브·외부 링크는 통과, 글/뉴스 상세·작성 등은 로그인 유도 대상.
 */
export function hrefRequiresLoginRedirect(href: string): boolean {
  const raw = href.trim();
  if (!raw.startsWith('/')) return false;

  if (raw === '/login' || raw.startsWith('/auth/')) return false;

  if (raw.startsWith('/news/')) {
    const rest = raw.slice('/news/'.length).split(/[?#]/)[0] ?? '';
    if (!rest || rest === '/') return false;
    return true;
  }

  const boardPost = raw.match(/^\/community\/boards\/([^/?#]+)/);
  if (boardPost?.[1]) {
    const seg = boardPost[1];
    if (seg === 'boards' || seg === 'trade') return false;
    /** `new`·글 id 등 글쓰기·상세는 로그인 유도 */
    return true;
  }

  if (raw.startsWith('/boards/new')) return true;

  if (raw === '/community/write' || raw.startsWith('/community/write?')) return true;

  const legacyBoard = raw.match(/^\/boards\/([^/?#]+)/);
  if (legacyBoard?.[1] && legacyBoard[1] !== 'new') return true;

  return false;
}
