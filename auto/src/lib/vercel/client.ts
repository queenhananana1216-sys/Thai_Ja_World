import 'server-only';

const BASE = 'https://api.vercel.com';

export type VercelFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  teamId?: string | null;
  body?: unknown;
};

export async function vercelFetch<T>(path: string, opts: VercelFetchOptions = {}): Promise<T> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error('VERCEL_TOKEN is not set');

  const url = new URL(path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`);
  const teamId = opts.teamId ?? process.env.VERCEL_TEAM_ID?.trim();
  if (teamId) url.searchParams.set('teamId', teamId);

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { raw: text };
    }
  }

  if (!res.ok) {
    const msg = typeof json === 'object' && json && 'error' in json ? JSON.stringify(json) : text || res.statusText;
    throw new Error(`Vercel API ${res.status}: ${msg}`);
  }

  return json as T;
}
