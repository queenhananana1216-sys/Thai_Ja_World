import 'server-only';

import { Agent, fetch as undiciFetch } from 'undici';
import { getPublicSupabaseUrl } from '@/lib/env';

const KEEPALIVE_AGENT = new Agent({
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 120_000,
  connections: 4,
});

export type SupabaseConnectivityStatus =
  | 'ok'
  | 'paused'
  | 'dns_error'
  | 'network_error'
  | 'misconfigured'
  | 'http_error';

export interface SupabaseConnectivityProbe {
  status: SupabaseConnectivityStatus;
  httpStatus?: number;
  host: string;
  message: string;
  ownerAction?: string;
}

const OWNER_UNPAUSE =
  'Supabase dashboard (https://supabase.com/dashboard) -> Restore project / Unpause. While Paused, all DB writes fail on Vercel and locally.';

export function getSupabaseRestHealthUrl(): string | null {
  const base = getPublicSupabaseUrl();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/rest/v1/`;
}

export async function probeSupabaseConnectivity(): Promise<SupabaseConnectivityProbe> {
  const healthUrl = getSupabaseRestHealthUrl();
  if (!healthUrl) {
    return {
      status: 'misconfigured',
      host: '',
      message: 'NEXT_PUBLIC_SUPABASE_URL is empty.',
      ownerAction: 'Set Supabase URL and SUPABASE_SERVICE_ROLE_KEY on Vercel Production and .env.local.',
    };
  }

  let host = '';
  try {
    host = new URL(healthUrl).host;
  } catch {
    return {
      status: 'misconfigured',
      host: '',
      message: 'NEXT_PUBLIC_SUPABASE_URL is invalid.',
    };
  }

  try {
    const res = await undiciFetch(healthUrl, {
      method: 'GET',
      dispatcher: KEEPALIVE_AGENT,
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 503 || res.status === 502) {
      return {
        status: 'paused',
        httpStatus: res.status,
        host,
        message: `Supabase host ${host} returned HTTP ${res.status} (project likely Paused).`,
        ownerAction: OWNER_UNPAUSE,
      };
    }

    if (!res.ok && res.status !== 401) {
      return {
        status: 'http_error',
        httpStatus: res.status,
        host,
        message: `Supabase REST HTTP ${res.status}`,
      };
    }

    return {
      status: 'ok',
      httpStatus: res.status,
      host,
      message: 'Supabase REST reachable',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code =
      err instanceof Error && 'code' in err
        ? String((err as NodeJS.ErrnoException).code)
        : '';
    const isDns = /ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(`${msg} ${code}`);
    return {
      status: isDns ? 'dns_error' : 'network_error',
      host,
      message: msg,
      ownerAction: isDns
        ? `${OWNER_UNPAUSE} DNS: nslookup ${host} 8.8.8.8`
        : OWNER_UNPAUSE,
    };
  }
}

export function formatProbeForConsole(probe: SupabaseConnectivityProbe): string {
  const lines = [`[supabase-probe] ${probe.status}: ${probe.message}`];
  if (probe.ownerAction) lines.push(`[supabase-probe] OWNER: ${probe.ownerAction}`);
  return lines.join('\n');
}
