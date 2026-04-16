/**
 * knowledge_sources 가 비어 있거나 search_rss만 있는 경우를 대비해,
 * 태자월드용 신뢰 RSS·공식 url_list 를 idempotent 로 보강합니다.
 * (supabase/migrations 039–043 과 동기화 유지)
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';

/** 태국 로컬(비자·치안·생활) 위주 — 월드/오피니언/비즈는 정치·거시 뉴스 비중이 커서 제외 */
const CURATED_RSS: { name: string; rss_url: string }[] = [
  { name: 'Bangkok Post — Thailand', rss_url: 'https://www.bangkokpost.com/rss/data/thailand.xml' },
];

const RSS_URLS_TO_DEACTIVATE = [
  'https://www.bangkokpost.com/rss/data/topstories.xml',
  'https://www.bangkokpost.com/rss/data/world.xml',
  'https://www.bangkokpost.com/rss/data/business.xml',
  'https://www.bangkokpost.com/rss/data/opinion.xml',
];

const URL_LIST_NAME = '태자월드 — 태·한 공식 (입국·비자·체류)';

const URL_LIST_ENTRIES: { url: string; label: string }[] = [
  { url: 'https://www.immigration.go.th/en/', label: '태국 출입국관리청 공식(영문) — 비자·체류·입국 안내' },
  { url: 'https://tdac.immigration.go.th/arrival-card/', label: '태국 디지털 도착신고 TDAC 공식 — 입국 서류' },
  { url: 'https://seoul.thaiembassy.org/', label: '주한 태국대사관 공식 — 비자·영사·태국 교민' },
  { url: 'https://www.hikorea.go.kr/', label: 'HiKorea 공식 — 한국 외국인 장기체류·체류지 통보' },
  { url: 'https://www.mofa.go.kr/www/nation/m_3458/list.do', label: '외교부 해외안전여행 — 태국 여행·안전·비자 참고' },
  { url: 'https://www.0404.go.kr/', label: '외국인 전자민원 1345 — 체류·입국 상담(한국)' },
  { url: 'https://www.overseas.go.kr/', label: '재외동포 포털 — 해외 거주·여행 정보(한국 교민)' },
];

const LIFESTYLE_URL_LIST_NAME = '태자월드 — 생활·맛집·여행(메타)';

const LIFESTYLE_URL_LIST_ENTRIES: { url: string; label: string }[] = [
  { url: 'https://www.bangkokpost.com/life/travel', label: 'Bangkok Post Travel·생활 — 태국 여행 맛집 정보' },
  { url: 'https://www.bangkokpost.com/travel/', label: 'Bangkok Post Travel 섹션 — 태국 관광 생활' },
  { url: 'https://www.bangkokpost.com/life/', label: 'Bangkok Post Life — 태국 현지 생활' },
];

export interface SeedCuratedKnowledgeSourcesResult {
  search_rss_deactivated: boolean;
  rss_inserted: number;
  url_list_inserted: boolean;
  lifestyle_url_list_inserted: boolean;
  error?: string;
}

export async function seedCuratedKnowledgeSources(): Promise<SeedCuratedKnowledgeSourcesResult> {
  const client = getServerSupabaseClient();
  const out: SeedCuratedKnowledgeSourcesResult = {
    search_rss_deactivated: false,
    rss_inserted: 0,
    url_list_inserted: false,
    lifestyle_url_list_inserted: false,
  };

  const { error: offErr } = await client
    .from('knowledge_sources')
    .update({ is_active: false })
    .eq('kind', 'search_rss');
  if (offErr) {
    out.error = `[knowledge_sources] search_rss 비활성화: ${offErr.message}`;
    return out;
  }
  out.search_rss_deactivated = true;

  const { error: offRssErr } = await client
    .from('knowledge_sources')
    .update({ is_active: false })
    .eq('kind', 'rss')
    .in('rss_url', RSS_URLS_TO_DEACTIVATE);
  if (offRssErr) {
    out.error = `[knowledge_sources] 구 RSS 비활성화: ${offRssErr.message}`;
    return out;
  }

  for (const row of CURATED_RSS) {
    const { data: existingRows, error: selErr } = await client
      .from('knowledge_sources')
      .select('id')
      .eq('kind', 'rss')
      .eq('rss_url', row.rss_url)
      .limit(1);
    if (selErr) {
      out.error = `[knowledge_sources] 조회: ${selErr.message}`;
      return out;
    }
    if (existingRows && existingRows.length > 0) continue;
    const { error: insErr } = await client.from('knowledge_sources').insert({
      name: row.name,
      kind: 'rss',
      rss_url: row.rss_url,
      is_active: true,
    });
    if (insErr) {
      out.error = `[knowledge_sources] insert rss: ${insErr.message}`;
      return out;
    }
    out.rss_inserted += 1;
  }

  const { data: ulRows, error: ulSelErr } = await client
    .from('knowledge_sources')
    .select('id')
    .eq('kind', 'url_list')
    .eq('name', URL_LIST_NAME)
    .limit(1);
  if (ulSelErr) {
    out.error = `[knowledge_sources] url_list 조회: ${ulSelErr.message}`;
    return out;
  }
  if (!ulRows?.length) {
    const { error: ulIns } = await client.from('knowledge_sources').insert({
      name: URL_LIST_NAME,
      kind: 'url_list',
      url_list_json: URL_LIST_ENTRIES,
      is_active: true,
    });
    if (ulIns) {
      out.error = `[knowledge_sources] insert url_list: ${ulIns.message}`;
      return out;
    }
    out.url_list_inserted = true;
  }

  const { data: lfRows, error: lfSelErr } = await client
    .from('knowledge_sources')
    .select('id')
    .eq('kind', 'url_list')
    .eq('name', LIFESTYLE_URL_LIST_NAME)
    .limit(1);
  if (lfSelErr) {
    out.error = `[knowledge_sources] 생활 url_list 조회: ${lfSelErr.message}`;
    return out;
  }
  if (!lfRows?.length) {
    const { error: lfIns } = await client.from('knowledge_sources').insert({
      name: LIFESTYLE_URL_LIST_NAME,
      kind: 'url_list',
      url_list_json: LIFESTYLE_URL_LIST_ENTRIES,
      is_active: true,
    });
    if (lfIns) {
      out.error = `[knowledge_sources] insert 생활 url_list: ${lfIns.message}`;
      return out;
    }
    out.lifestyle_url_list_inserted = true;
  }

  return out;
}
