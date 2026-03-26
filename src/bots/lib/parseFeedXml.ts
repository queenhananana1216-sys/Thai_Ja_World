/**
 * parseFeedXml.ts — RSS 2.0 / Atom 피드 본문에서 항목 추출 (의존성 없음)
 */

export interface ParsedFeedItem {
  title: string;
  link: string;
  published_at?: string | null;
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
}

function cleanInnerXml(inner: string): string {
  let t = stripCdata(inner).trim();
  t = t.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(t).trim();
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m?.[1]) return null;
  return cleanInnerXml(m[1]);
}

function extractRssLink(block: string): string | null {
  const m = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  if (m?.[1]) {
    const u = cleanInnerXml(m[1]);
    if (u) return u;
  }
  return null;
}

function extractAtomLink(entryBlock: string): string | null {
  const re = /<link\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  let fallback: string | null = null;
  while ((m = re.exec(entryBlock)) !== null) {
    const attrs = m[1] ?? '';
    const hrefM = attrs.match(/\bhref=["']([^"']+)["']/i);
    const href = hrefM?.[1];
    if (!href) continue;
    const relM = attrs.match(/\brel=["']([^"']+)["']/i);
    const rel = relM?.[1]?.toLowerCase() ?? '';
    if (rel === 'alternate' || rel === '' || rel === 'self') return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function parseRss(xml: string, limit: number): ParsedFeedItem[] {
  const out: ParsedFeedItem[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && out.length < limit) {
    const block = m[0];
    const title = extractTag(block, 'title');
    const link = extractRssLink(block);
    const pubDate = extractTag(block, 'pubDate') ?? extractTag(block, 'dc:date');
    if (title && link) {
      out.push({ title, link, published_at: pubDate ?? null });
    }
  }
  return out;
}

function parseAtom(xml: string, limit: number): ParsedFeedItem[] {
  const out: ParsedFeedItem[] = [];
  const entryRe = /<entry\b[\s\S]*?<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null && out.length < limit) {
    const block = m[0];
    const title = extractTag(block, 'title');
    const link = extractAtomLink(block);
    const published =
      extractTag(block, 'published') ?? extractTag(block, 'updated') ?? null;
    if (title && link) {
      out.push({ title, link, published_at: published });
    }
  }
  return out;
}

/**
 * RSS 또는 Atom XML 문자열에서 최대 `limit`개 항목을 파싱합니다.
 */
export function parseFeedXml(xml: string, limit: number): ParsedFeedItem[] {
  const head = xml.slice(0, 4000).toLowerCase();
  const looksAtom =
    head.includes('http://www.w3.org/2005/atom') ||
    (/<feed\b/i.test(xml) && !head.includes('<rss'));
  if (looksAtom) return parseAtom(xml, limit);
  if (head.includes('<rss') || head.includes('<channel')) return parseRss(xml, limit);
  const entryCount = (xml.match(/<entry\b/gi) ?? []).length;
  const itemCount = (xml.match(/<item\b/gi) ?? []).length;
  if (entryCount > itemCount) return parseAtom(xml, limit);
  return parseRss(xml, limit);
}
