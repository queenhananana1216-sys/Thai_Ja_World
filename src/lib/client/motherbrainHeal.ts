/**
 * 전역/세그먼트 에러 시 ISR 무효화·복구 트리거 (report-ui-error 와 동일 키 헤더).
 */
export async function requestMotherbrainHeal(pathname?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const key = process.env.NEXT_PUBLIC_UI_INCIDENT_KEY?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-tj-ui-incident-key'] = key;

  try {
    const res = await fetch('/api/health/motherbrain-heal', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pathname: pathname ?? window.location?.pathname ?? '',
      }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
