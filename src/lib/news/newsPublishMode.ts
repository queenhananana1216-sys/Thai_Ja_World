/**
 * NEWS_PUBLISH_MODE:
 *   manual (기본·미설정) — published=false 로만 저장, /admin/news 에서 «홈에 게시» 후 공개
 *   auto — LLM 저장 직후 홈·뉴스에 노출 (승인 큐 사용 안 함)
 *
 * 즉시 공개가 필요하면 환경변수 NEWS_PUBLISH_MODE=auto 만 설정합니다.
 */
export function newsInsertAsPublished(): boolean {
  const m = process.env.NEWS_PUBLISH_MODE?.trim().toLowerCase();
  if (m === 'auto') return true;
  return false;
}

/** Vercel/로컬 환경변수 그대로(빈 값이면 표시용 문구) */
export function newsPublishModeEnvRaw(): string {
  const v = process.env.NEWS_PUBLISH_MODE?.trim();
  return v && v.length > 0 ? v : '(미설정 → manual)';
}

/** 관리자 안내 한 줄 */
export function newsPublishPipelineHint(): string {
  return newsInsertAsPublished()
    ? 'NEWS_PUBLISH_MODE=auto 입니다. 요약 저장과 동시에 공개되므로 초안 큐가 비어 있을 수 있습니다. 승인 후 올리려면 이 변수를 제거하거나 manual 로 두세요.'
    : 'manual(또는 미설정)입니다. 새로 쌓이는 기사는 여기 초안에만 보이며, «홈에 게시»를 눌러야 방문자에게 노출됩니다.';
}
