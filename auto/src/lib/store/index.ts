import 'server-only';
import { ensureSchema, getSql } from '@/lib/db/postgres';
import type { AuditRow, ConnectedWallet, DomainPoolRow, OpsSettings, SiteMode } from './types';
import { memoryStore } from './memory';

async function useDb(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  await ensureSchema();
  return true;
}

export async function listDomains(): Promise<DomainPoolRow[]> {
  if (!(await useDb())) return memoryStore.listDomains();
  const sql = getSql()!;
  const rows = await sql<
    {
      id: string;
      hostname: string;
      status: string;
      priority: number;
      note: string | null;
      created_at: string;
    }[]
  >`SELECT id, hostname, status, priority, note, created_at FROM auto_domain_pool ORDER BY priority DESC, hostname ASC`;
  return rows.map((r) => ({
    id: r.id,
    hostname: r.hostname,
    status: r.status as DomainPoolRow['status'],
    priority: r.priority,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function upsertDomain(input: {
  hostname: string;
  status: DomainPoolRow['status'];
  priority: number;
  note: string | null;
}): Promise<DomainPoolRow> {
  const host = input.hostname.trim().toLowerCase();
  if (!(await useDb())) return memoryStore.upsertDomain({ ...input, hostname: host });
  const sql = getSql()!;
  const rows = await sql<{ id: string; created_at: string }[]>`
    INSERT INTO auto_domain_pool (hostname, status, priority, note)
    VALUES (${host}, ${input.status}, ${input.priority}, ${input.note})
    ON CONFLICT (hostname) DO UPDATE SET
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      note = EXCLUDED.note
    RETURNING id, created_at
  `;
  const row = rows[0];
  if (!row) throw new Error('upsertDomain failed');
  return {
    id: row.id,
    hostname: host,
    status: input.status,
    priority: input.priority,
    note: input.note,
    createdAt: row.created_at,
  };
}

export async function deleteDomain(hostname: string): Promise<boolean> {
  const h = hostname.trim().toLowerCase();
  if (!(await useDb())) return memoryStore.deleteDomain(h);
  const sql = getSql()!;
  const r = await sql`DELETE FROM auto_domain_pool WHERE hostname = ${h}`;
  return r.count > 0;
}

export async function getSettings(): Promise<OpsSettings> {
  if (!(await useDb())) return memoryStore.getSettings();
  const sql = getSql()!;
  const rows = await sql<
    {
      site_mode: string;
      lock_auto: boolean;
      last_standby_at: string | null;
      last_domain_switch_at: string | null;
      daily_domain_switches: number;
      daily_domain_switches_date: string | null;
      cooldown_until: string | null;
      anomaly_score: number;
      consecutive_health_failures: number;
    }[]
  >`SELECT site_mode, lock_auto, last_standby_at, last_domain_switch_at, daily_domain_switches, daily_domain_switches_date, cooldown_until, anomaly_score, consecutive_health_failures FROM auto_ops_settings WHERE id = 1`;
  const r = rows[0];
  if (!r) {
    return {
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
  }
  return {
    siteMode: r.site_mode as SiteMode,
    lockAuto: r.lock_auto,
    lastStandbyAt: r.last_standby_at,
    lastDomainSwitchAt: r.last_domain_switch_at,
    dailyDomainSwitches: r.daily_domain_switches,
    dailyDomainSwitchesDate: r.daily_domain_switches_date,
    cooldownUntil: r.cooldown_until,
    anomalyScore: r.anomaly_score,
    consecutiveHealthFailures: r.consecutive_health_failures,
  };
}

export async function patchSettings(p: Partial<OpsSettings>): Promise<OpsSettings> {
  if (!(await useDb())) return memoryStore.patchSettings(p);
  const cur = await getSettings();
  const next: OpsSettings = { ...cur, ...p };
  const sql = getSql()!;
  await sql`
    UPDATE auto_ops_settings SET
      site_mode = ${next.siteMode},
      lock_auto = ${next.lockAuto},
      last_standby_at = ${next.lastStandbyAt},
      last_domain_switch_at = ${next.lastDomainSwitchAt},
      daily_domain_switches = ${next.dailyDomainSwitches},
      daily_domain_switches_date = ${next.dailyDomainSwitchesDate},
      cooldown_until = ${next.cooldownUntil},
      anomaly_score = ${next.anomalyScore},
      consecutive_health_failures = ${next.consecutiveHealthFailures}
    WHERE id = 1
  `;
  return next;
}

export async function setSiteMode(mode: SiteMode): Promise<OpsSettings> {
  const now = new Date().toISOString();
  if (!(await useDb())) {
    memoryStore.setSiteMode(mode);
    if (mode === 'standby') memoryStore.patchSettings({ lastStandbyAt: now });
    return memoryStore.getSettings();
  }
  const sql = getSql()!;
  if (mode === 'standby') {
    await sql`
      UPDATE auto_ops_settings SET site_mode = ${mode}, last_standby_at = ${now}
      WHERE id = 1
    `;
  } else {
    await sql`
      UPDATE auto_ops_settings SET site_mode = ${mode}
      WHERE id = 1
    `;
  }
  return getSettings();
}

export async function appendAudit(action: string, detail: Record<string, unknown>): Promise<AuditRow> {
  if (!(await useDb())) return memoryStore.pushAudit(action, detail);
  const sql = getSql()!;
  const rows = await sql<{ id: string; at: string }[]>`
    INSERT INTO auto_audit_log (action, detail) VALUES (${action}, ${sql.json(JSON.parse(JSON.stringify(detail)) as never)})
    RETURNING id, at
  `;
  const r = rows[0];
  if (!r) throw new Error('appendAudit failed');
  return { id: r.id, at: r.at, action, detail };
}

export async function listAudit(limit: number): Promise<AuditRow[]> {
  if (!(await useDb())) return memoryStore.listAudit(limit);
  const sql = getSql()!;
  const rows = await sql<{ id: string; at: string; action: string; detail: Record<string, unknown> }[]>`
    SELECT id, at, action, detail FROM auto_audit_log ORDER BY at DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    action: r.action,
    detail: r.detail,
  }));
}

export async function getConnectedWallet(): Promise<ConnectedWallet> {
  if (!(await useDb())) return memoryStore.getConnectedWallet();
  const sql = getSql()!;
  const rows = await sql<{ evm_address: string | null; chain_id: number; updated_at: string }[]>`
    SELECT evm_address, chain_id, updated_at FROM auto_connected_wallet WHERE id = 1
  `;
  const r = rows[0];
  if (!r) return { evmAddress: null, chainId: 1, updatedAt: null };
  return {
    evmAddress: r.evm_address,
    chainId: r.chain_id,
    updatedAt: r.updated_at,
  };
}

export async function setConnectedWallet(input: { evmAddress: string | null; chainId: number }): Promise<ConnectedWallet> {
  if (!(await useDb())) return memoryStore.setConnectedWallet(input);
  const sql = getSql()!;
  const now = new Date().toISOString();
  await sql`
    UPDATE auto_connected_wallet SET evm_address = ${input.evmAddress}, chain_id = ${input.chainId}, updated_at = ${now}::timestamptz WHERE id = 1
  `;
  return getConnectedWallet();
}
