import 'server-only';
import type { NextRequest } from 'next/server';
import { getRequestClientIp } from '@/lib/ingest/clientIp';

function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getIngestSecret(): string | null {
  return process.env.INGEST_BOT_SECRET?.trim() || null;
}

/**
 * Bearer INGEST_BOT_SECRET + (선택) INGEST_IP_ALLOWLIST 에 Nord 전용 IP 등록
 */
export function isIngestAuthorized(req: NextRequest): { ok: true; clientIp: string | null } | { ok: false; reason: string } {
  const secret = getIngestSecret();
  if (!secret) {
    return { ok: false, reason: 'INGEST_BOT_SECRET not configured' };
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, reason: 'invalid or missing Authorization' };
  }

  const allow = parseAllowlist(process.env.INGEST_IP_ALLOWLIST);
  const clientIp = getRequestClientIp(req);
  if (allow.length > 0) {
    if (!clientIp) {
      return { ok: false, reason: 'client IP unknown (set INGEST_IP_ALLOWLIST only when IP is visible)' };
    }
    if (!allow.some((a) => a === clientIp)) {
      return { ok: false, reason: 'IP not in INGEST_IP_ALLOWLIST' };
    }
  }

  return { ok: true, clientIp };
}
