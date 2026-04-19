const AI_LIKE_MARKERS = [
  /\(\s*\uC6B4\uC601\s*\uC0D8\uD50C\s*\)/gi,
  /\b\uC6B4\uC601\s*\uC0D8\uD50C\b/gi,
  /\b\uC790\uB3D9\s*\uCD08\uC548\b/gi,
  /\bllm\s*(\uAC00\uACF5\s*\uC804|\uC694\uC57D\s*\uC804|\uBBF8\uAC00\uACF5|\uC0DD\uC131)\b/gi,
  /\uC2B9\uC778\s*\uC804\uC5D0\s*\uB2E4\uB4EC\uC5B4\s*\uC8FC\uC138\uC694/gi,
  /\bai\s*generated\b/gi,
  /\bgenerated\s*by\s*ai\b/gi,
  /\btbd\b/gi,
];

function stripAiMarkers(text: string): string {
  let out = text;
  for (const re of AI_LIKE_MARKERS) {
    out = out.replace(re, " ");
  }
  return out;
}

export function decodeEscapedNewlines(text: string): string {
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n");
}

export function normalizeUserFacingText(
  raw: string | null | undefined,
  opts?: { singleLine?: boolean; maxLen?: number },
): string {
  const maxLen = opts?.maxLen ?? 5000;
  let out = decodeEscapedNewlines(raw ?? "");
  out = stripAiMarkers(out);
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  if (opts?.singleLine) {
    out = out.replace(/\n+/g, " ");
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  if (out.length > maxLen) {
    out = `${out.slice(0, maxLen - 1).trim()}...`;
  }
  return out;
}

export function containsAiLikeMarker(raw: string | null | undefined): boolean {
  const text = raw ?? "";
  return AI_LIKE_MARKERS.some((re) => re.test(text));
}
