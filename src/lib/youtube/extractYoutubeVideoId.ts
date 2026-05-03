/**
 * Extract YouTube video id (11 chars) from common URL shapes.
 * Keeps logic aligned with SQL `public.youtube_extract_video_id`.
 */
export function extractYoutubeVideoId(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const tryMatch = (re: RegExp): string | null => {
    const m = s.match(re);
    return m?.[1] && m[1].length === 11 ? m[1] : null;
  };

  let id =
    tryMatch(/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#]|$)/i) ??
    tryMatch(/youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})(?:[?#]|$)/i) ??
    tryMatch(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})(?:[?#]|$)/i) ??
    tryMatch(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:[?#]|$)/i) ??
    tryMatch(/youtube\.com\/live\/([A-Za-z0-9_-]{11})(?:[?#]|$)/i);

  if (!id && /youtube\.com\/watch\?/i.test(s)) {
    try {
      const u = new URL(s);
      const v = u.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) id = v;
    } catch {
      id = tryMatch(/[?&]v=([A-Za-z0-9_-]{11})(?:&|#|$)/i);
    }
  }

  return id;
}

export function canonicalYoutubeEmbedUrl(videoId: string): string {
  const id = videoId.trim();
  return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&playsinline=1&loop=1&playlist=${id}`;
}
