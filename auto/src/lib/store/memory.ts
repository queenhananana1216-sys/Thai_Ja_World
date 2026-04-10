import { randomUUID } from 'node:crypto';
import type { AuditRow, ConnectedWallet, DomainPoolRow, OpsSettings, SiteMode } from './types';

/** 서버리스에서 DB 없을 때만 사용 — 인스턴스 간 공유 안 됨 */
const domains = new Map<string, DomainPoolRow>();
let settings: OpsSettings = {
  siteMode: 'normal',
  lockAuto: false,
  lastStandbyAt: null,
  lastDomainSwitchAt: null,
  dailyDomainSwitches: 0,
  dailyDomainSwitchesDate: null,
  cooldownUntil: null,
  anomalyScore: 0,
  consecutiveHealthFailures: 0,
};
const audits: AuditRow[] = [];
let connectedWallet: ConnectedWallet = { evmAddress: null, chainId: 1, updatedAt: null };

function id(): string {
  return randomUUID();
}

export const memoryStore = {
  listDomains(): DomainPoolRow[] {
    return [...domains.values()].sort((a, b) => b.priority - a.priority || a.hostname.localeCompare(b.hostname));
  },
  upsertDomain(input: { hostname: string; status: DomainPoolRow['status']; priority: number; note: string | null }): DomainPoolRow {
    const host = input.hostname.trim().toLowerCase();
    const existing = [...domains.values()].find((d) => d.hostname === host);
    const row: DomainPoolRow = {
      id: existing?.id ?? id(),
      hostname: host,
      status: input.status,
      priority: input.priority,
      note: input.note,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    domains.set(row.id, row);
    return row;
  },
  deleteDomain(hostname: string): boolean {
    const h = hostname.trim().toLowerCase();
    for (const [k, v] of domains) {
      if (v.hostname === h) {
        domains.delete(k);
        return true;
      }
    }
    return false;
  },
  getSettings(): OpsSettings {
    return { ...settings };
  },
  patchSettings(p: Partial<OpsSettings>): OpsSettings {
    settings = { ...settings, ...p };
    return settings;
  },
  setSiteMode(mode: SiteMode): OpsSettings {
    settings.siteMode = mode;
    if (mode === 'standby') settings.lastStandbyAt = new Date().toISOString();
    return settings;
  },
  pushAudit(action: string, detail: Record<string, unknown>): AuditRow {
    const row: AuditRow = { id: id(), at: new Date().toISOString(), action, detail };
    audits.unshift(row);
    if (audits.length > 500) audits.length = 500;
    return row;
  },
  listAudit(limit: number): AuditRow[] {
    return audits.slice(0, limit);
  },
  getConnectedWallet(): ConnectedWallet {
    return { ...connectedWallet };
  },
  setConnectedWallet(input: { evmAddress: string | null; chainId: number }): ConnectedWallet {
    connectedWallet = {
      evmAddress: input.evmAddress,
      chainId: input.chainId,
      updatedAt: new Date().toISOString(),
    };
    return { ...connectedWallet };
  },
};
