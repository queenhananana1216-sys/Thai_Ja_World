/**
 * 구글 공유 문자열 또는 URL 에서 Places API(details) 에 넘길 place id 후보 추출.
 * 검증 확정은 `placesDetails` 성공 여부가 기준입니다.
 */
export function coerceGooglePlaceIdInput(input: string): string | null {
  let t = String(input ?? '').trim().replace(/^['"`]+|['"`]+$/g, '');
  if (!t) return null;

  const qp = t.match(/[?&](?:placeid|place_id)=([^&]+)/i);
  if (qp?.[1]) t = decodeURIComponent(qp[1].trim()).replace(/^places\/?/i, '');

  const embedded = t.match(/(ChIJ[0-9A-Za-z\-_]{14,})/)?.[1];
  if (embedded) return embedded;

  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const tail = u.pathname.split('/').filter(Boolean).pop()?.trim() ?? '';
      if (/^ChIJ[0-9A-Za-z\-_]+$/.test(tail)) return tail;
      const q = u.searchParams.get('q')?.trim();
      if (q && /^ChIJ[0-9A-Za-z\-_]+$/.test(q)) return q;
    }
  } catch {
    /* 폴백 */
  }

  const noSpaces = t.replace(/\s+/g, '').replace(/^places\/?/i, '');
  if (/^ChIJ[0-9A-Za-z\-_]{14,}$/.test(noSpaces)) return noSpaces;
  const placesSeg = t.match(/places\/([A-Za-z0-9_-]{12,})/i)?.[1];
  if (placesSeg) return placesSeg.trim();

  return null;
}
