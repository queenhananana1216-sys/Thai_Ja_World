/**
 * collectKnowledge.ts — knowledge_sources DB에서 소스를 읽어 raw_knowledge 수집
 *
 * 수집 방식(kind):
 *   rss        — rss_url 에서 RSS/Atom 파싱
 *   url_list   — url_list_json[].url 을 직접 메타 fetch
 *   search_rss — search_query 로 Google News RSS 생성 후 파싱
 *
 * 환경 변수:
 *   KNOWLEDGE_ITEMS_PER_SOURCE — 소스당 최대 수집 항목 수 (기본 5, 상한 20)
 *   KNOWLEDGE_MAX_RAW_BODY_LEN — raw_body 최대 저장 길이 (기본 2000)
 *   KNOWLEDGE_FRESHNESS_DAYS   — 발행일 기준 몇 일 이내만 수집 (기본 90, 0=제한없음)
 *   KNOWLEDGE_RELEVANCE_KEYWORDS — 추가 관련성 키워드 (쉼표 구분)
 *   KNOWLEDGE_TRUST_MODE       — strict(기본)=신뢰 도메인만, loose=차단 목록만
 *   KNOWLEDGE_TRUSTED_HOST_SUFFIXES / KNOWLEDGE_BLOCKED_HOST_SUFFIXES — 쉼표 구분 접미 목록
 *   KNOWLEDGE_RELEVANCE_MODE   — strict(기본)=비자·생활·사건/안전 위주, loose=키워드 넓게
 *   (맛집·음식·여행 키워드는 앵커에 포함 — knowledge_sources 로 소스 추가 시 DB 기반 확장)
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { isKnowledgeUrlAccepted, trustedUrlRank } from '../lib/knowledgeTrust';
import { parseFeedXml } from '../lib/parseFeedXml';
import type { ActionResult } from '../types/botTypes';

// ── 상수 ──────────────────────────────────────────────────────────────────

const DEFAULT_ITEMS_PER_SOURCE = 5;
const MAX_ITEMS_PER_SOURCE = 20;
const DEFAULT_MAX_BODY_LEN = 2000;
const FETCH_TIMEOUT_MS = 20_000;

/**
 * strict: 앵커 키워드 1개 이상, 또는 (태국·지명 + 생활/사건 맥락 키워드) 조합
 * loose : 아래 넓은 목록 중 하나만 있어도 통과
 */
const ANCHOR_KEYWORDS = [
  '비자', 'visa', '장기체류', '체류', '입국', '출국', '연장', '서류', 'document',
  'immigration', 'overstay', 'extension', 'work permit', 'tm30', '90-day', '90 day',
  'arrival card', 'tdac', 'digital arrival', 'border', 'embassy', 'consulate',
  '꿀팁', '생활', '교민', '거주', '보험', '운전', '면허', '환전', '은행', '병원',
  'rental', 'apartment', 'housing', 'school', 'health', 'insurance',
  '사건', '사고', '안전', '실종', '범죄', '교통', '화재',
  'scam', 'fraud', 'warn', 'warning', 'arrest', 'police', 'accident', 'crash',
  'killed', 'injured', 'missing', 'theft', 'robbery', 'sentence', 'jailed', 'prison',
  'fire', 'flood', 'storm', 'dengue', 'outbreak',
  'air quality', 'pollution', 'pm2.5', 'smog', 'haze', 'dust',
  'airport', 'flight', 'airline', 'airfare', 'baggage', 'cancelled flights',
  'tourist', 'tourism', 'foreigner', 'expat', 'travel advisory',
  'fuel', 'diesel', 'petrol', 'gasoline', 'exchange rate',
  '맛집', '먹거리', '카페', '레스토랑', '미슐랭', '길거리', '야시장', '배달',
  'restaurant', 'dining', 'food', 'brunch', 'buffet', 'michelin', 'street food',
  'night market', 'cafe', 'coffee', 'dessert', 'chef', 'menu', 'bakery', 'bistro',
  'eatery', 'hawker', 'foodie', 'recipe', 'cuisine', 'grab food', 'delivery',
];

const WEAK_REGION_KEYWORDS = [
  'thailand', 'thai', 'bangkok', 'phuket', 'pattaya', 'chiang mai', 'krabi', 'hua hin',
  '태국',
];

/** 태국/지명만 나오는 기사는 반드시 함께 쓰일 맥락 (생활·사건·이동·치안 등) */
const REGION_CONTEXT_KEYWORDS = [
  'tourist', 'foreigner', 'expat', 'police', 'accident', 'scam', 'warn', 'airport', 'flight',
  'visa', 'immigration', 'border', 'hospital', 'killed', 'injured', 'fire', 'flood',
  'crime', 'arrest', 'theft', 'pollution', 'dust', 'health', 'beach', 'resort', 'hotel',
  'dengue', 'pm2.5', 'smog', 'diesel', 'petrol', 'fuel', 'airfare', 'exchange',
  'restaurant', 'food', 'cafe', 'hotel', 'dining', 'market', 'street food', 'chef',
];

const LOOSE_KEYWORDS = [
  ...ANCHOR_KEYWORDS,
  '태국', 'thailand', 'thai', '여행', '이민', '이주', '세금', '보험',
];

/** 정부·정치 일반 기사 헤드라인 (비자·외국인·입국 등 훅이 없으면 제외) */
const POLITICAL_HEADLINE_RES: RegExp[] = [
  /^poll:/i,
  /^pm\b/i,
  /^prime minister/i,
  /^cabinet /i,
  /^parliament /i,
  /^ruling /i,
  /^opposition /i,
  /^senate /i,
  /^army denies/i,
  /^navy /i,
  /^government /i,
  /^govt /i,
  /^state audit/i,
  /^deputy pm/i,
  /^minister of (defence|defense|interior|energy|finance|agriculture)\b/i,
];

const POLITICAL_EXEMPT_HOOK_RE =
  /\b(visa|immigration|foreign|foreigner|tourist|expat|embassy|consulate|비자|입국|체류|arrival|border|airport|scam|warn|tdac|overstay|extension)\b/i;

// ── 타입 ──────────────────────────────────────────────────────────────────

export interface KnowledgeSourceRow {
  id: string;
  name: string;
  kind: 'rss' | 'url_list' | 'search_rss';
  rss_url: string | null;
  url_list_json: unknown;
  search_query: string | null;
}

export interface CollectedKnowledgeItem {
  source_id: string;
  external_url: string;
  title_original: string;
  raw_body: string | null;
  published_at: string | null;
  content_hash: string | null;
}

export interface CollectKnowledgeOutput {
  items: CollectedKnowledgeItem[];
  sources_attempted: string[];
  sources_succeeded: string[];
  sources_failed: { source_id: string; name: string; error: string }[];
  items_per_source: number;
  fetched_at: string;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────

function parseItemsPerSource(): number {
  const raw = process.env.KNOWLEDGE_ITEMS_PER_SOURCE;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_ITEMS_PER_SOURCE;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ITEMS_PER_SOURCE;
  return Math.min(n, MAX_ITEMS_PER_SOURCE);
}

function maxRawBodyLen(): number {
  const raw = process.env.KNOWLEDGE_MAX_RAW_BODY_LEN;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_BODY_LEN;
  if (!Number.isFinite(n) || n < 100) return DEFAULT_MAX_BODY_LEN;
  return n;
}

function freshnessDays(): number {
  const raw = process.env.KNOWLEDGE_FRESHNESS_DAYS;
  const n = raw ? Number.parseInt(raw, 10) : 90;
  if (!Number.isFinite(n) || n < 0) return 90;
  return n;
}

function relevanceExtraKeywords(): string[] {
  const extra = process.env.KNOWLEDGE_RELEVANCE_KEYWORDS?.trim();
  return extra
    ? extra.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
}

function relevanceMode(): 'strict' | 'loose' {
  return process.env.KNOWLEDGE_RELEVANCE_MODE?.trim().toLowerCase() === 'loose' ? 'loose' : 'strict';
}

function isPoliticalChaffTitle(title: string): boolean {
  if (POLITICAL_EXEMPT_HOOK_RE.test(title)) return false;
  const t = title.trim();
  return POLITICAL_HEADLINE_RES.some((re) => re.test(t));
}

/** 비자·생활·사건/안전 위주 (strict 기본). 정치·정부 일반 헤드라인은 훅 없으면 제외 */
function isRelevant(title: string): boolean {
  if (!title) return false;
  if (isPoliticalChaffTitle(title)) return false;
  const lower = title.toLowerCase();
  const extras = relevanceExtraKeywords();

  if (relevanceMode() === 'loose') {
    const kws = [...LOOSE_KEYWORDS.map((k) => k.toLowerCase()), ...extras];
    return kws.some((k) => lower.includes(k));
  }

  const anchors = [...ANCHOR_KEYWORDS.map((k) => k.toLowerCase()), ...extras];
  if (anchors.some((k) => lower.includes(k))) return true;
  const hasRegion = WEAK_REGION_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
  const hasContext = REGION_CONTEXT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
  return hasRegion && hasContext;
}

/** 너무 오래된 항목 필터 (freshness) */
function isFresh(publishedAt: string | null | undefined): boolean {
  const days = freshnessDays();
  if (days === 0) return true;
  if (!publishedAt) return true; // 날짜 없으면 통과
  try {
    const d = new Date(publishedAt);
    if (isNaN(d.getTime())) return true;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return d.getTime() >= cutoff;
  } catch {
    return true;
  }
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    // 추적 파라미터 제거
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((p) =>
      u.searchParams.delete(p),
    );
    return u.toString();
  } catch {
    return raw.trim();
  }
}

/** simple hash — 중복 감지 보조 (PII 없는 구조적 중복 체크) */
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16);
}

function truncateBody(body: string): string {
  const max = maxRawBodyLen();
  if (body.length <= max) return body;
  return body.slice(0, max - 1).trimEnd() + '…';
}

/** 배치 내·제목 유사 중복 제거용 정규화 키 */
function normalizeTitleKey(title: string): string {
  const t = title.trim().toLowerCase();
  if (!t) return '';
  return t
    .normalize('NFKC')
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s가-힣一-龠ぁ-ゖァ-ヺ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 같은 실행에서 URL 중복 제거 → 신뢰 도메인 우선 정렬 → 정규화 제목 중복은 첫 항목만 유지
 */
function finalizeCollectedItems(items: CollectedKnowledgeItem[]): CollectedKnowledgeItem[] {
  const seenUrl = new Set<string>();
  const urlDeduped = items.filter((i) => {
    if (seenUrl.has(i.external_url)) return false;
    seenUrl.add(i.external_url);
    return true;
  });
  const sorted = [...urlDeduped].sort(
    (a, b) => trustedUrlRank(a.external_url) - trustedUrlRank(b.external_url),
  );
  const seenTitle = new Set<string>();
  const out: CollectedKnowledgeItem[] = [];
  for (const it of sorted) {
    const tk = normalizeTitleKey(it.title_original);
    if (tk) {
      if (seenTitle.has(tk)) continue;
      seenTitle.add(tk);
    }
    out.push(it);
  }
  return out;
}

function buildGoogleNewsRssUrl(query: string): string {
  const hl = (process.env.NEWS_GOOGLE_RSS_HL?.trim() || 'ko').toLowerCase();
  const gl = (process.env.NEWS_GOOGLE_RSS_GL?.trim() || 'KR').toUpperCase();
  const ceid = `${gl}:${hl}`;
  const encQ = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encQ}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

// ── RSS 파싱 헬퍼 ─────────────────────────────────────────────────────────

async function fetchAndParseRss(
  url: string,
  limit: number,
): Promise<{ items: Array<{ title: string; link: string; published_at: string | null }>; error?: string }> {
  if (!isValidHttpUrl(url)) {
    return { items: [], error: `유효하지 않은 URL: ${url}` };
  }

  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'TaiJaWorld-Bot/1.0 (+https://taijaworld.com)' },
      signal: ctrl.signal,
    });
  } catch (e) {
    return { items: [], error: `fetch 실패: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    return { items: [], error: `HTTP ${res.status} — RSS fetch 실패: ${url}` };
  }

  const xml = await res.text().catch(() => '');
  if (!xml.trim()) {
    return { items: [], error: 'RSS 응답 본문이 비어 있습니다.' };
  }

  const parsed = parseFeedXml(xml, limit);
  return {
    items: parsed.map((p) => ({
      title: p.title,
      link: p.link,
      published_at: p.published_at ?? null,
    })),
  };
}

// ── URL 직접 fetch (url_list 방식) ────────────────────────────────────────

async function fetchPageMeta(url: string): Promise<{ title: string; snippet: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TaiJaWorld-Bot/1.0 (+https://taijaworld.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { title: '', snippet: null };
    }
    const html = await res.text();

    // <title> 추출
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';

    // og:description 또는 <meta name="description"> 로 snippet
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const snippet = ogDesc ?? metaDesc ?? null;

    return { title: rawTitle, snippet: snippet ?? null };
  } catch {
    return { title: '', snippet: null };
  } finally {
    clearTimeout(timer);
  }
}

// ── 메인 수집 함수 ─────────────────────────────────────────────────────────

export async function collectKnowledge(
  input: Record<string, unknown> = {},
): Promise<ActionResult<CollectKnowledgeOutput>> {
  const fetchedAt = new Date().toISOString();
  const itemsPerSource =
    typeof input.itemsPerSource === 'number'
      ? Math.min(Math.max(Math.floor(input.itemsPerSource), 1), MAX_ITEMS_PER_SOURCE)
      : parseItemsPerSource();

  const client = getServerSupabaseClient();

  // 1) 활성 소스 조회
  const { data: sources, error: srcErr } = await client
    .from('knowledge_sources')
    .select('id, name, kind, rss_url, url_list_json, search_query')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (srcErr || !sources?.length) {
    return {
      success: sources?.length === 0,
      output: {
        items: [],
        sources_attempted: [],
        sources_succeeded: [],
        sources_failed: [],
        items_per_source: itemsPerSource,
        fetched_at: fetchedAt,
      },
      error: srcErr ? new Error(`[knowledge_sources] ${srcErr.message}`) : undefined,
    };
  }

  const allItems: CollectedKnowledgeItem[] = [];
  const batchUrlSeen = new Set<string>();
  const sourcesAttempted: string[] = [];
  const sourcesSucceeded: string[] = [];
  const sourcesFailed: CollectKnowledgeOutput['sources_failed'] = [];

  for (const src of sources as KnowledgeSourceRow[]) {
    sourcesAttempted.push(src.id);

    if (src.kind === 'rss' || src.kind === 'search_rss') {
      const feedUrl =
        src.kind === 'rss'
          ? (src.rss_url ?? '')
          : src.search_query
            ? buildGoogleNewsRssUrl(src.search_query)
            : '';

      if (!feedUrl) {
        sourcesFailed.push({ source_id: src.id, name: src.name, error: 'rss_url 또는 search_query 없음' });
        continue;
      }

      const { items: feedItems, error: feedErr } = await fetchAndParseRss(feedUrl, itemsPerSource);
      if (feedErr) {
        sourcesFailed.push({ source_id: src.id, name: src.name, error: feedErr });
        continue;
      }

      let added = 0;
      for (const fi of feedItems) {
        if (!fi.link || !isValidHttpUrl(fi.link)) continue;
        if (!isRelevant(fi.title)) continue;
        if (!isFresh(fi.published_at)) continue;
        const canonical = canonicalizeUrl(fi.link);
        if (batchUrlSeen.has(canonical) || !isKnowledgeUrlAccepted(canonical)) continue;
        batchUrlSeen.add(canonical);
        allItems.push({
          source_id: src.id,
          external_url: canonical,
          title_original: fi.title,
          raw_body: null, // RSS 본문 없음 — 지식 가공(process) 시 external_url에서 본문 fetch 후 LLM에 전달
          published_at: fi.published_at ?? null,
          content_hash: simpleHash(fi.title + canonical),
        });
        added++;
        if (added >= itemsPerSource) break;
      }

      if (added > 0) sourcesSucceeded.push(src.id);
      else if (!feedErr) {
        // 수집은 됐지만 관련성 필터로 0개 → failed로 기록하지 않음
        sourcesSucceeded.push(src.id);
      }
    } else if (src.kind === 'url_list') {
      let urlList: Array<{ url?: string; label?: string }> = [];
      try {
        const raw = src.url_list_json;
        if (Array.isArray(raw)) {
          urlList = raw as typeof urlList;
        }
      } catch {
        sourcesFailed.push({ source_id: src.id, name: src.name, error: 'url_list_json 파싱 실패' });
        continue;
      }

      if (!urlList.length) {
        sourcesFailed.push({ source_id: src.id, name: src.name, error: 'url_list_json이 비어 있음' });
        continue;
      }

      let added = 0;
      for (const entry of urlList.slice(0, itemsPerSource)) {
        const url = entry.url?.trim();
        if (!url || !isValidHttpUrl(url)) continue;
        const canonical = canonicalizeUrl(url);
        if (batchUrlSeen.has(canonical) || !isKnowledgeUrlAccepted(canonical)) continue;

        const { title, snippet } = await fetchPageMeta(canonical);
        if (!title && !snippet) continue;
        if (!isRelevant(title || entry.label || '')) continue;

        batchUrlSeen.add(canonical);
        const body = snippet ? truncateBody(snippet) : null;
        allItems.push({
          source_id: src.id,
          external_url: canonical,
          title_original: title || entry.label || canonical,
          raw_body: body,
          published_at: null,
          content_hash: simpleHash((title || canonical) + canonical),
        });
        added++;
      }

      if (added > 0) sourcesSucceeded.push(src.id);
      else sourcesSucceeded.push(src.id); // 빈 결과도 성공으로 간주
    }
  }

  const finalized = finalizeCollectedItems(allItems);

  return {
    success: true,
    output: {
      items: finalized,
      sources_attempted: sourcesAttempted,
      sources_succeeded: sourcesSucceeded,
      sources_failed: sourcesFailed,
      items_per_source: itemsPerSource,
      fetched_at: fetchedAt,
    },
  };
}
