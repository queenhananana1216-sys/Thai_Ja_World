import 'server-only';

/** 출처 URL은 감사용만 — 서버가 임의 URL fetch 하지 않음(SSRF 방지) */
export function validateSourceUrlForAudit(
  raw: string | null,
  allowedHostsRaw: string | undefined,
): { ok: true; hostname: string } | { ok: false; reason: string } {
  if (!raw?.trim()) {
    return { ok: true, hostname: '' };
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'invalid source URL' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'source URL protocol not allowed' };
  }
  const host = url.hostname.toLowerCase();
  const allowed = (allowedHostsRaw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    return { ok: true, hostname: host };
  }
  const match = allowed.some((rule) => {
    if (rule.startsWith('*.')) {
      const base = rule.slice(2);
      return host === base || host.endsWith(`.${base}`);
    }
    return host === rule;
  });
  if (!match) {
    return { ok: false, reason: 'source host not in INGEST_ALLOWED_SOURCE_HOSTS' };
  }
  return { ok: true, hostname: host };
}
