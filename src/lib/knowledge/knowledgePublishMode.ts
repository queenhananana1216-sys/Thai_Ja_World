/**
 * KNOWLEDGE_PUBLISH_MODE:
 *   manual (기본·미설정) — published=false 초안만 → /admin/knowledge 에서 승인 후 posts 게시
 *   auto — 가공 직후 published=true 가능(승인 큐 우회). 운영에서는 비권장.
 *
 * 뉴스(NEWS_PUBLISH_MODE)와 동일하게, 오직 명시적 `auto` 만 즉시 공개 경로로 씁니다.
 */
export function knowledgeInsertAsPublished(): boolean {
  return process.env.KNOWLEDGE_PUBLISH_MODE?.trim().toLowerCase() === 'auto';
}

export function knowledgePublishModeEnvRaw(): string {
  const v = process.env.KNOWLEDGE_PUBLISH_MODE?.trim();
  return v && v.length > 0 ? v : '(미설정 → manual)';
}

export function knowledgePublishPipelineHint(): string {
  return knowledgeInsertAsPublished()
    ? 'KNOWLEDGE_PUBLISH_MODE=auto 입니다. 일부 파이프라인은 초안을 건너뛸 수 있습니다. 승인만 쓰려면 auto 를 제거하세요.'
    : 'manual(또는 미설정)입니다. 지식 초안은 «지식 큐»에서 승인하면 광장 게시글로 올라갑니다.';
}
