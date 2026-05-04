/**
 * 클라이언트·서버 공통 — Open-Meteo 3도시 스냅샷 완성 여부 (server-only 없음).
 */
export function isThailandWeatherSnapshotComplete(
  cities: { key: string; temperature_c: number | null }[] | null | undefined,
): boolean {
  if (!Array.isArray(cities) || cities.length < 3) return false;
  const keys = new Set(cities.map((c) => c.key));
  for (const k of ['bangkok', 'pattaya', 'chiang_mai'] as const) {
    if (!keys.has(k)) return false;
  }
  return cities.every((c) => typeof c.temperature_c === 'number' && Number.isFinite(c.temperature_c));
}
