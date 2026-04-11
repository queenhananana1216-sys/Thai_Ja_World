/** href에서 표시용 호스트 (www 제거) */
export function linkHostLabel(href: string): string {
  try {
    const h = new URL(href).hostname;
    return h.replace(/^www\./, '');
  } catch {
    return '';
  }
}
