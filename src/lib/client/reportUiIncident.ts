/**
 * Error Boundary 등 클라이언트에서 UI 인시던트를 서버로 전달 (keepalive).
 */
export async function reportUiIncident(payload: {
  source: string;
  message: string;
  digest?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_UI_INCIDENT_KEY?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-tj-ui-incident-key'] = key;

  try {
    await fetch('/api/health/report-ui-error', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        pathname: window.location?.pathname ?? '',
      }),
      keepalive: true,
    });
  } catch {
    /* offline — 무시 */
  }
}
