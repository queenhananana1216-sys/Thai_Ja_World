/**
 * 광장 글 본문·발췌·검증 — 서버·클라이언트 공통 (미리보기와 실제 게시 동일 로직)
 */
import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';
import { isKnowledgeStubKoSummary } from '@/lib/knowledge/knowledgeStubConstants';

export function parseKnowledgeCleanBody(existing: unknown): KnowledgeLlmOutput | null {
  try {
    if (typeof existing === 'string') return JSON.parse(existing) as KnowledgeLlmOutput;
    if (existing && typeof existing === 'object') return existing as KnowledgeLlmOutput;
  } catch {
    /* ignore */
  }
  return null;
}

function bullets(items: string[]): string {
  const list = (items ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (!list.length) return '- (없음)';
  return list.map((x) => `- ${x}`).join('\n');
}

function excerptFromKoSummary(summary: string): string {
  const t = summary.trim();
  if (!t) return '';
  const firstBlock = t.split(/\n{2,}/)[0]?.trim() ?? t;
  const oneLine = firstBlock.split('\n')[0]?.trim() ?? firstBlock;
  const base = oneLine.length > 280 ? `${oneLine.slice(0, 277)}…` : oneLine;
  return base.slice(0, 500);
}

/** 로그인 사용자·/tips 훅에 쓰는 posts.excerpt 와 동일 규칙 */
export function excerptFromKnowledgeKo(ko: { summary: string; editorial_note?: string }): string {
  const ed = ko.editorial_note?.trim() ?? '';
  const sum = ko.summary?.trim() ?? '';
  if (ed && isKnowledgeStubKoSummary(sum)) return excerptFromKoSummary(ed);
  if (ed && sum) return excerptFromKoSummary(`${sum}\n\n${ed}`);
  if (ed) return excerptFromKoSummary(ed);
  return excerptFromKoSummary(sum);
}

export function validateKnowledgePublish(ko_summary: string, ko_editorial_note: string): string | null {
  const sum = ko_summary.trim();
  const ed = ko_editorial_note.trim();
  if (isKnowledgeStubKoSummary(sum)) {
    if (ed.length < 25) {
      return '원문 요약이 비어 있을 때는 「태자 편집팀·이용자 안내」에 25자 이상 적어 주시면 게시할 수 있어요.';
    }
    return null;
  }
  if (sum.length < 10) {
    return '한국어 요약을 10자 이상 작성해 주세요.';
  }
  return null;
}

export function buildPostContent(llm: KnowledgeLlmOutput, fallbackSourceUrl?: string): string {
  const ko = llm.ko;
  const th = llm.th;
  const koTags = Array.isArray(ko?.tags) ? ko.tags : [];
  const thTags = Array.isArray(th?.tags) ? th.tags : [];
  const koCheck = Array.isArray(ko?.checklist) ? ko.checklist : [];
  const thCheck = Array.isArray(th?.checklist) ? th.checklist : [];
  const koCaut = Array.isArray(ko?.cautions) ? ko.cautions : [];
  const thCaut = Array.isArray(th?.cautions) ? th.cautions : [];

  const sources =
    Array.isArray(llm.sources) && llm.sources.length > 0
      ? llm.sources
      : fallbackSourceUrl
        ? [{ external_url: fallbackSourceUrl, source_name: '', retrieved_at: new Date().toISOString() }]
        : [];
  const sourceLines = bullets(sources.map((s) => s.external_url).filter(Boolean));

  const koLines = [
    `요약\n${ko?.summary ?? ''}`,
    ko?.editorial_note?.trim()
      ? `\n태자 편집팀·이용자 안내\n${ko.editorial_note.trim()}`
      : '',
    `\n체크리스트\n${bullets(koCheck)}`,
    `\n주의사항\n${bullets(koCaut)}`,
    koTags.length ? `\n태그\n${koTags.map((t) => `#${t}`).join(' ')}` : '',
    `\n출처\n${sourceLines}`,
  ].filter(Boolean);

  const thLines = [
    `\n---\nไทย 요약\n${th?.summary ?? ''}`,
    th?.editorial_note?.trim() ? `\nหมายเหตุทีมบรรณาธิการ\n${th.editorial_note.trim()}` : '',
    `\n체็กลิสต์\n${bullets(thCheck)}`,
    `\nข้อควรระวัง\n${bullets(thCaut)}`,
    thTags.length ? `\nแท็ก\n${thTags.map((t) => `#${t}`).join(' ')}` : '',
  ].filter(Boolean);

  return [...koLines, ...thLines].join('\n');
}
