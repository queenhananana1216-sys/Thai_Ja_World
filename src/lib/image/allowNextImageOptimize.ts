/**
 * `next.config` `images.remotePatterns`와 맞춘 호스트만 기본 최적화(리사이즈·포맷).
 * 그 외 URL은 `unoptimized`로 두어 빌드/런타임 오류를 피합니다.
 */
export function allowNextImageRemoteOptimize(src: string): boolean {
  const s = src.trim();
  if (!s.startsWith('http')) return true;
  try {
    const h = new URL(s).hostname.toLowerCase();
    if (h.endsWith('.supabase.co')) return true;
    if (h === 'api.qrserver.com') return true;
    return false;
  } catch {
    return false;
  }
}
