'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from '@/lib/adminAuth';
import {
  appendAudit,
  deleteDomain,
  getSettings,
  patchSettings,
  setConnectedWallet,
  setSiteMode,
  upsertDomain,
} from '@/lib/store';
import { syncEdgeConfigSiteState } from '@/lib/engine/edgeSync';
import { promoteStandbyDomain } from '@/lib/engine/promoteDomain';
import { runHealthWatchOnce } from '@/lib/engine/watch';
import { sendAutoPaymentIfConfigured } from '@/lib/payment/evm';
import { isAddress } from 'viem';

async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect('/admin/login');
  }
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
  redirect('/admin/login');
}

export async function setSiteModeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const mode = String(formData.get('mode') ?? '');
  if (mode !== 'normal' && mode !== 'standby') return;
  await setSiteMode(mode);
  const s = await getSettings();
  await syncEdgeConfigSiteState({ siteMode: s.siteMode, canonicalHost: null });
  await appendAudit('manual_set_mode', { mode });
  revalidatePath('/admin');
}

export async function toggleLockAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const lock = String(formData.get('lock') ?? '') === '1';
  await patchSettings({ lockAuto: lock });
  await appendAudit('manual_lock', { lock });
  revalidatePath('/admin');
}

export async function addDomainAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const hostname = String(formData.get('hostname') ?? '').trim();
  const priority = Number(formData.get('priority') ?? 0);
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!hostname) return;
  await upsertDomain({
    hostname,
    status: 'standby',
    priority: Number.isFinite(priority) ? priority : 0,
    note,
  });
  await appendAudit('pool_add', { hostname });
  revalidatePath('/admin');
}

export async function deleteDomainAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const hostname = String(formData.get('hostname') ?? '').trim();
  if (!hostname) return;
  await deleteDomain(hostname);
  await appendAudit('pool_delete', { hostname });
  revalidatePath('/admin');
}

export async function promoteDomainAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const hostname = String(formData.get('hostname') ?? '').trim();
  if (!hostname) return;
  const r = await promoteStandbyDomain(hostname);
  if (!r.ok) {
    await appendAudit('promote_failed', { hostname, reason: r.reason });
  } else {
    await sendAutoPaymentIfConfigured({ reason: 'manual_domain_promote', meta: { hostname } });
  }
  revalidatePath('/admin');
}

export async function bindWalletAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const raw = String(formData.get('address') ?? '').trim();
  const chainId = Number(formData.get('chainId') ?? '1');
  const addr = raw.length > 0 ? raw : null;
  if (addr && !isAddress(addr)) {
    await appendAudit('wallet_bind_invalid', { address: raw });
    revalidatePath('/admin');
    return;
  }
  await setConnectedWallet({ evmAddress: addr, chainId: Number.isFinite(chainId) ? chainId : 1 });
  await appendAudit('wallet_bound', { address: addr, chainId });
  revalidatePath('/admin');
}

export async function manualWatchAction(): Promise<void> {
  await requireAdmin();
  await runHealthWatchOnce();
  revalidatePath('/admin');
}
