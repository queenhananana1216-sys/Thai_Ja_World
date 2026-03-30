/**
 * collectArticles.ts — RSS/Atom 피드에서 기사 메타데이터 수집 (collect_data)
 *
 * 환경 변수:
 *   NEWS_RSS_URLS       — 쉼표로 구분된 피드 URL 목록 (필수)
 *   NEWS_GOOGLE_RSS_QUERIES — NEWS_RSS_URLS가 비어있을 때 사용할 Google News RSS 검색 쿼리 목록(쉼표 구분)
 *                           예: "태국 살이 꿀팁,방콕 생활 정보"
 *   NEWS_GOOGLE_RSS_HL  — Google News 검색 언어 (기본: ko)
 *   NEWS_GOOGLE_RSS_GL  — Google News 검색 국가 (기본: TH — 태국 대국·생활 정보 위주)
 *   NEWS_ITEMS_PER_FEED — 피드당 가져올 최대 항목 수 (기본 8, 상한 50)
 */

import type { ActionResult } from '../types/botTypes';
import { parseFeedXml } from '../lib/parseFeedXml';

export interface CollectedArticle {
  title: string;
  link: string;
  published_at?: string | null;
  feed_url: string;
}

export interface CollectArticlesOutput {
  articles: CollectedArticle[];
  feeds_attempted: string[];
  feeds_succeeded: string[];
  feeds_failed: { url: string; error: string }[];
  items_per_feed: number;
  fetched_at: string;
}

const DEFAULT_ITEMS = 8;
const MAX_ITEMS = 50;
const FETCH_TIMEOUT_MS = 20_000;

function parseItemsPerFeed(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_ITEMS;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ITEMS;
  return Math.min(n, MAX_ITEMS);
}

function parseFeedUrlsFromEnv(): string[] {
  // 1) 직접 피드 URL을 주면 그걸 우선 사용
  const raw = process.env.NEWS_RSS_URLS?.trim() ?? '';
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 2) 없으면 Google News RSS 검색 쿼리로 피드를 생성
  const queriesRaw = process.env.NEWS_GOOGLE_RSS_QUERIES?.trim() ?? '';
  /** 기본: 태국 대국 생활·정보·꿀팁 (수집 후 manual 모드면 /admin/news 에서 승인) */
  const defaultQueries = [
    '태국 살이 생활 정보',
    '태국 한국인 꿀팁',
    '방콕 생활 정착',
    '태국 비자 한국인',
    '태국 장기체류 한국인',
    '치앙마이 살이 한국인',
    '파타야 생활 정보',
    '태국 병원 의료 한국인',
    '태국 은행 계좌 외국인',
    '태국 교통 대중교통',
    '태국 맛집 추천',
    '태국 부동산 월세',
  ];

  const queries = (queriesRaw ? queriesRaw : defaultQueries.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const hl = (process.env.NEWS_GOOGLE_RSS_HL?.trim() || 'ko').toLowerCase();
  const gl = (process.env.NEWS_GOOGLE_RSS_GL?.trim() || 'TH').toUpperCase();

  // ceid 예시: KR:ko
  return queries.map((q) => {
    const ceid = `${gl}:${hl}`;
    const encQ = encodeURIComponent(q);
    return `https://news.google.com/rss/search?q=${encQ}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  });
}

function isAllowedFeedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * NEWS_RSS_URLS 기준으로 피드를 가져와 항목을 수집합니다.
 *
 * @param input — runCollectLoop 의 input_payload (선택)
 *   - itemsPerFeed: number (1–50), env 보다 우선
 */
export async function collectArticles(
  input: Record<string, unknown> = {},
): Promise<ActionResult<CollectArticlesOutput>> {
  const envItems = parseItemsPerFeed(process.env.NEWS_ITEMS_PER_FEED);
  let itemsPerFeed = envItems;
  if (typeof input.itemsPerFeed === 'number' && Number.isFinite(input.itemsPerFeed)) {
    itemsPerFeed = Math.min(MAX_ITEMS, Math.max(1, Math.floor(input.itemsPerFeed)));
  }

  const feedUrls = parseFeedUrlsFromEnv();
  const invalid = feedUrls.filter((u) => !isAllowedFeedUrl(u));
  const validUrls = feedUrls.filter((u) => isAllowedFeedUrl(u));

  const emptyOutput: CollectArticlesOutput = {
    articles: [],
    feeds_attempted: validUrls,
    feeds_succeeded: [],
    feeds_failed: [],
    items_per_feed: itemsPerFeed,
    fetched_at: new Date().toISOString(),
  };

  if (feedUrls.length === 0) {
    return {
      success: false,
      output: emptyOutput,
      error: new Error(
        'NEWS_RSS_URLS 가 비어 있습니다. .env.local 에 쉼표로 구분된 RSS/Atom URL 을 설정하세요.',
      ),
    };
  }

  if (invalid.length > 0) {
    return {
      success: false,
      output: {
        ...emptyOutput,
        feeds_failed: invalid.map((url) => ({ url, error: 'Invalid http(s) URL' })),
      },
      error: new Error(`허용되지 않은 피드 URL 이 포함되어 있습니다: ${invalid.join(', ')}`),
    };
  }

  const articles: CollectedArticle[] = [];
  const feedsSucceeded: string[] = [];
  const feedsFailed: { url: string; error: string }[] = [];

  for (const feedUrl of validUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'User-Agent': 'TaejaWorld-Bot/1.0 (+collectArticles)',
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        feedsFailed.push({ url: feedUrl, error: `HTTP ${res.status}` });
        continue;
      }

      const xml = await res.text();
      const items = parseFeedXml(xml, itemsPerFeed);
      for (const it of items) {
        articles.push({
          title: it.title,
          link: it.link,
          published_at: it.published_at,
          feed_url: feedUrl,
        });
      }
      feedsSucceeded.push(feedUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      feedsFailed.push({ url: feedUrl, error: msg });
    }
  }

  const output: CollectArticlesOutput = {
    articles,
    feeds_attempted: validUrls,
    feeds_succeeded: feedsSucceeded,
    feeds_failed: feedsFailed,
    items_per_feed: itemsPerFeed,
    fetched_at: new Date().toISOString(),
  };

  if (articles.length === 0 && validUrls.length > 0) {
    return {
      success: false,
      output,
      error: new Error(
        '모든 피드에서 항목을 가져오지 못했습니다. URL·네트워크·피드 형식을 확인하세요.',
      ),
    };
  }

  return { success: true, output };
}
