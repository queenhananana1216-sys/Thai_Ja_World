/** posts.content HTML/마크다운 제거 후 한 줄 미리보기 */
export function stripToPreview(raw: string | null | undefined, maxLen: number): string {
  if (!raw) return '';
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function portalMetaLine(
  post: { excerpt: string | null; content: string | null },
  maxLen = 72,
): string {
  const ex = post.excerpt?.trim();
  if (ex) return ex.length > maxLen ? `${ex.slice(0, maxLen)}…` : ex;
  return stripToPreview(post.content, maxLen);
}
