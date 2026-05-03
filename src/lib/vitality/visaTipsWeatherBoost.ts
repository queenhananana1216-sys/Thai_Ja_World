export type VisaTipLine = {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
};

function rainRelevanceScore(text: string, locale: 'ko' | 'th'): number {
  const t = text.toLowerCase();
  if (locale === 'th') {
    const keys = ['ฝน', 'ร่ม', 'มรสุม', 'น้ำท่ว', 'ฤดูฝน', 'ในร่ม', 'mrt', 'bts'];
    return keys.reduce((acc, k) => acc + (t.includes(k) ? 4 : 0), 0);
  }
  const keys = ['비', '우산', '장마', '몬순', '습기', '침수', '실내', 'mrt', 'bts', '우천'];
  return keys.reduce((acc, k) => acc + (t.includes(k) ? 4 : 0), 0);
}

/** 강수 시 꿀팁 허브 상단에 우천·실내 동선 키워드 글을 끌어올림 */
export function reorderVisaTipsForRain(
  lines: VisaTipLine[],
  locale: 'ko' | 'th',
  isRainy: boolean,
): VisaTipLine[] {
  if (!isRainy || lines.length < 2) return lines;
  const loc = locale === 'th' ? 'th' : 'ko';
  const scored = lines.map((line) => {
    const blob = `${line.title} ${line.subtitle ?? ''}`;
    return { line, score: rainRelevanceScore(blob, loc) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.line);
}
