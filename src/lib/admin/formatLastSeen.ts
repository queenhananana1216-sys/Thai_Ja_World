/** 관리자 테이블·개요 카드와 동일: 최근 5분 내 하트비트면 활동 중으로 표시 */
const ONLINE_MS = 5 * 60 * 1000;

export function formatLastSeenAdmin(iso: string | null | undefined): {
  relative: string;
  likelyOnline: boolean;
} {
  if (!iso?.trim()) {
    return { relative: '기록 없음', likelyOnline: false };
  }
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) {
    return { relative: '—', likelyOnline: false };
  }
  const diff = Date.now() - t;
  if (diff < ONLINE_MS) {
    return { relative: '방금 활동', likelyOnline: true };
  }
  if (diff < 60_000) return { relative: `${Math.floor(diff / 1000)}초 전`, likelyOnline: false };
  if (diff < 3600_000) return { relative: `${Math.floor(diff / 60_000)}분 전`, likelyOnline: false };
  if (diff < 86400_000) return { relative: `${Math.floor(diff / 3600_000)}시간 전`, likelyOnline: false };
  return { relative: new Date(iso).toLocaleString('ko-KR'), likelyOnline: false };
}
