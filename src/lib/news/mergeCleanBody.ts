import type { ParsedCleanBody } from '@/lib/news/processedNewsDisplay';

function parseExisting(cleanBody: string | null): ParsedCleanBody {
  if (!cleanBody?.trim()) return {};
  try {
    const o = JSON.parse(cleanBody) as ParsedCleanBody;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/**
 * 관리자가 한·태 제목·요약만 손볼 때 clean_body JSON 병합
 */
export function mergeBilingualCleanBody(
  existingJson: string | null,
  patch: {
    ko_title?: string;
    ko_summary?: string;
    th_title?: string;
    th_summary?: string;
  },
): string {
  const base = parseExisting(existingJson);
  const ko = { ...(base.ko ?? {}) };
  const th = { ...(base.th ?? {}) };

  if (patch.ko_title?.trim()) ko.title = patch.ko_title.trim();
  if (patch.ko_summary?.trim()) ko.summary = patch.ko_summary.trim();
  if (patch.th_title?.trim()) th.title = patch.th_title.trim();
  if (patch.th_summary?.trim()) th.summary = patch.th_summary.trim();

  return JSON.stringify({
    ...base,
    ko,
    th,
  });
}
