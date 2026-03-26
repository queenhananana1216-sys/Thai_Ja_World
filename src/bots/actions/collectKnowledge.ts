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
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { parseFeedXml } from '../lib/parseFeedXml';
import type { ActionResult } from '../types/botTypes';

// ── 상수 ──────────────────────────────────────────────────────────────────

const DEFAULT_ITEMS_PER_SOURCE = 5;
const MAX_ITEMS_PER_SOURCE = 20;
const DEFAULT_MAX_BODY_LEN = 2000;
const FETCH_TIMEOUT_MS = 20_000;

/** 1차 관련성 필터 키워드 (태국/비자/생활 관련) */
const BUILTIN_KEYWORDS = [
  '태국', 'thailand', 'thai', '비자', 'visa', '서류', 'document',
  '장기체류', '체류', '꿀팁', '생활', '교민', '입국', '출국',
  '여행', '거주', '이민', '이주', '보험', '세금', '운전',
];

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

function relevanceKeywords(): string[] {
  const extra = process.env.KNOWLEDGE_RELEVANCE_KEYWORDS?.trim();
  const extras = extra
    ? extra.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  return [...BUILTIN_KEYWORDS.map((k) => k.toLowerCase()), ...extras];
}

/** 1차 관련성 필터: 제목에 키워드 1개 이상 포함이면 관련 있음 */
function isRelevant(title: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const kws = relevanceKeywords();
  return kws.some((k) => lower.includes(k));
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
        allItems.push({
          source_id: src.id,
          external_url: canonical,
          title_original: fi.title,
          raw_body: null, // RSS는 요약 없으므로 null (process 단계에서 URL fetch 가능)
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

        const { title, snippet } = await fetchPageMeta(canonical);
        if (!title && !snippet) continue;
        if (!isRelevant(title || entry.label || '')) continue;

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

  return {
    success: true,
    output: {
      items: allItems,
      sources_attempted: sourcesAttempted,
      sources_succeeded: sourcesSucceeded,
      sources_failed: sourcesFailed,
      items_per_source: itemsPerSource,
      fetched_at: fetchedAt,
    },
  };
}
