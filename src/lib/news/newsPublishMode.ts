/**
 * NEWS_PUBLISH_MODE:
 *   auto (기본) — LLM 저장 직후 홈에 노출
 *   manual — published=false 로만 저장, /admin/news 에서 승인 후 공개
 */
export function newsInsertAsPublished(): boolean {
  const m = process.env.NEWS_PUBLISH_MODE?.trim().toLowerCase();
  if (m === 'manual' || m === 'review' || m === 'draft') return false;
  return true;
}

/** Vercel/로컬 환경변수 그대로(빈 값이면 표시용 문구) */
export function newsPublishModeEnvRaw(): string {
  const v = process.env.NEWS_PUBLISH_MODE?.trim();
  return v && v.length > 0 ? v : '(미설정)';
}

/** 관리자 안내 한 줄 */
export function newsPublishPipelineHint(): string {
  return newsInsertAsPublished()
    ? '지금은 auto입니다. 긁어온 뉴스는 요약 저장과 동시에 공개되므로 «초안(미게시)» 카드가 0인 것이 정상입니다. 승인 후 올리려면 Vercel 환경변수에 NEWS_PUBLISH_MODE=manual 을 넣고 재배포하세요.'
    : 'manual 모드입니다. 미게시 건은 아래 «뉴스 초안 큐»에서 승인하면 홈·뉴스에 올라갑니다.';
}
