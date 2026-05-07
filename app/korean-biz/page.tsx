import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import KoreanBizHubClient from './KoreanBizHubClient';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/seo/site';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { ensureKoreanBizMinimumRows } from '@/lib/korean-biz/ensureKoreanBizMinimumRows';
import {
  fetchKoreanBusinessesForPublicPageResilient,
  fetchKoreanBusinessesViaServiceRole,
} from '@/lib/korean-biz/fetchKoreanBusinesses';
import { getKoreanBizStaleSnapshotCached } from '@/lib/korean-biz/koreanBizPublicSnapshotCache';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  const url = absoluteUrl('/korean-biz');
  const title = `한인 생활망 — 마트·약국·병원·렌트·골프·스파 | ${ui.siteDisplayName}`;
  const description =
    '방콕·파타야·치앙마이 한인 마트, 약국, 병원, 오토바이·차량 렌트, 골프 투어, 마사지·스파 연락처. 검증 시각을 함께 표시합니다.';
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ko_KR',
    },
  };
}

export default async function KoreanBizPage() {
  noStore();
  const locale = await getLocale();
  const sb = createServerClient();
  let { rows, error } = await fetchKoreanBusinessesForPublicPageResilient(sb, { retries: 4 });
  let fromStaleSnapshot = false;

  const needSelfHeal = rows.length === 0 || Boolean(error) || rows.length < 10;
  if (needSelfHeal) {
    await ensureKoreanBizMinimumRows();
    const second = await fetchKoreanBusinessesForPublicPageResilient(sb, { retries: 4 });
    rows = second.rows;
    error = second.error;
  }

  if (rows.length === 0) {
    const stale = await getKoreanBizStaleSnapshotCached();
    if (stale.length > 0) {
      rows = stale;
      error = null;
      fromStaleSnapshot = true;
    }
  }

  if (rows.length === 0) {
    const svc = await fetchKoreanBusinessesViaServiceRole();
    if (svc.rows.length > 0) {
      rows = svc.rows;
      error = null;
    } else if (svc.error) {
      error = svc.error;
    }
  }

  if (rows.length === 0 && error) {
    await recordPipelineErrorEvent({
      scope: 'public/korean-biz',
      reasonCode: 'korean_biz_page_empty_after_self_heal',
      messageExcerpt: error.message,
      meta: { code: error.code ?? null, from_stale_snapshot: fromStaleSnapshot },
    });
  }

  const globalEmpty = rows.length === 0;
  const fetchError = Boolean(error) && rows.length === 0;

  return (
    <div className="min-h-[70vh] bg-[#060a12] bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),_transparent_55%)]">
      <KoreanBizHubClient rows={rows} locale={locale} globalEmpty={globalEmpty} fetchError={fetchError} />
    </div>
  );
}
