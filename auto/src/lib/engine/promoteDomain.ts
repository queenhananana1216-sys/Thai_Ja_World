import 'server-only';
import { appendAudit, getSettings, listDomains, patchSettings, upsertDomain } from '@/lib/store';
import { addProjectDomain } from '@/lib/vercel/domains';
import { syncEdgeConfigSiteState } from '@/lib/engine/edgeSync';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseMaxDaily(): number {
  const n = Number(process.env.AUTO_MAX_DOMAIN_SWITCHES_PER_DAY ?? '5');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function parseCooldownMs(): number {
  const n = Number(process.env.AUTO_STANDBY_COOLDOWN_MS ?? String(60 * 60 * 1000));
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 1000;
}

/**
 * 풀에서 지정 도메인을 Vercel 프로젝트에 붙이고 active로 표시. 나머지 풀 항목은 standby. canonical_host Edge 동기화.
 */
export async function promoteStandbyDomain(hostname: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const projectId = process.env.TAEJA_VERCEL_PROJECT_ID?.trim();
  if (!projectId) return { ok: false, reason: 'TAEJA_VERCEL_PROJECT_ID missing' };

  const settings = await getSettings();
  const today = todayUtc();
  let daily = settings.dailyDomainSwitches;
  let date = settings.dailyDomainSwitchesDate;
  if (date !== today) {
    daily = 0;
    date = today;
  }
  if (daily >= parseMaxDaily()) {
    return { ok: false, reason: 'daily domain switch limit reached' };
  }

  const host = hostname.trim().toLowerCase();
  await addProjectDomain(projectId, host);

  const domains = await listDomains();
  const known = new Set(domains.map((d) => d.hostname));
  if (!known.has(host)) {
    await upsertDomain({ hostname: host, status: 'active', priority: 0, note: 'promoted' });
  }
  const refreshed = await listDomains();
  for (const d of refreshed) {
    await upsertDomain({
      hostname: d.hostname,
      status: d.hostname === host ? 'active' : 'standby',
      priority: d.priority,
      note: d.note,
    });
  }

  const now = new Date().toISOString();
  const cooldownUntil = new Date(Date.now() + parseCooldownMs()).toISOString();
  await patchSettings({
    lastDomainSwitchAt: now,
    dailyDomainSwitches: daily + 1,
    dailyDomainSwitchesDate: date ?? today,
    cooldownUntil,
  });

  const edge = await syncEdgeConfigSiteState({
    siteMode: settings.siteMode,
    canonicalHost: host,
  });
  if (!edge.ok && edge.error) {
    await appendAudit('promote_domain_edge_failed', { host, error: edge.error });
  }

  await appendAudit('promote_domain', { hostname: host, projectId });
  return { ok: true };
}
