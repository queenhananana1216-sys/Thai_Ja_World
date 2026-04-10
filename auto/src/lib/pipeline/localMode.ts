import 'server-only';

/**
 * 로컬·숨김 우선: 외부 AI 게이트웨이로 운영 신호를 보내지 않음.
 * AUTO_PIPELINE_LOCAL_ONLY=1 또는 LLANGKKA_PIPELINE_LOCAL_ONLY=1
 */
export function isPipelineLocalOnly(): boolean {
  const a = process.env.AUTO_PIPELINE_LOCAL_ONLY?.trim();
  const b = process.env.LLANGKKA_PIPELINE_LOCAL_ONLY?.trim();
  if (a === '1' || b === '1') return true;
  if (a === '0' || b === '0') return false;
  return false;
}

/** 외부 브레인에 강령 텍스트를 섞을지(기본 끔 — 유출·프라이버시) */
export function shouldIncludeCharterInExternalPrompt(): boolean {
  return process.env.AUTO_BRAIN_INCLUDE_CHARTER?.trim() === '1';
}
