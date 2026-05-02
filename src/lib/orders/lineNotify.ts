import 'server-only';

/** LINE Notify HTTPS API — 토큰은 서버에서만 사용 (노출 금지). */
export async function sendLineNotifyMessage(
  token: string,
  message: string,
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, status: 400, body: 'empty_token' };

  const body = new URLSearchParams();
  body.set('message', message.slice(0, 980));

  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${trimmed}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
  return { ok: true };
}
