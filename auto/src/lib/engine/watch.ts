import 'server-only';
import {
  brainRecommendsReturnNormal,
  brainRecommendsStandby,
  pickPromoteHostname,
  runBrainDecision,
  trafficRiskToAnomalyScore,
} from '@/lib/brain/decide';
import type { BrainDecision } from '@/lib/brain/schema';
import { sendAutoPaymentIfConfigured } from '@/lib/payment/evm';
import { appendAudit, getSettings, listDomains, patchSettings, setSiteMode } from '@/lib/store';
import { syncEdgeConfigSiteState } from '@/lib/engine/edgeSync';
import { promoteStandbyDomain } from '@/lib/engine/promoteDomain';

function parseThreshold(): number {
  const n = Number(process.env.AUTO_HEALTH_FAIL_THRESHOLD ?? '3');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

export async function runHealthWatchOnce(): Promise<{
  status: number | null;
  enteredStandby: boolean;
  promoted: boolean;
  detail: Record<string, unknown>;
}> {
  const url = process.env.TAEJA_PUBLIC_URL?.trim();
  if (!url) {
    return { status: null, enteredStandby: false, promoted: false, detail: { error: 'TAEJA_PUBLIC_URL missing' } };
  }

  let status: number | null = null;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store' });
    status = res.status;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendAudit('health_probe_error', { error: msg });
    status = null;
  }

  let settings = await getSettings();
  const threshold = parseThreshold();
  let failures = settings.consecutiveHealthFailures;

  if (status !== null && status < 500) {
    failures = 0;
  } else {
    failures += 1;
  }

  await patchSettings({ consecutiveHealthFailures: failures });

  const domains = await listDomains();
  const brain = await runBrainDecision({
    taejaPublicUrl: url,
    lastHttpStatus: status,
    consecutiveFailures: failures,
    failureThreshold: threshold,
    siteMode: settings.siteMode,
    domains,
  });

  let brainSnapshot: BrainDecision | null = null;
  if (brain) {
    brainSnapshot = brain;
    await patchSettings({ anomalyScore: trafficRiskToAnomalyScore(brain.traffic_risk) });
    await appendAudit('brain_decision', {
      summary: brain.summary,
      traffic_risk: brain.traffic_risk,
      recommended_action: brain.recommended_action,
      target_hostname: brain.target_hostname,
      confidence: brain.confidence,
    });
  }

  const detail: Record<string, unknown> = {
    status,
    failures,
    threshold,
    lockAuto: settings.lockAuto,
    brain: brainSnapshot,
  };

  if (settings.lockAuto) {
    await appendAudit('health_watch_skipped_locked', detail);
    return { status, enteredStandby: false, promoted: false, detail };
  }

  if (settings.cooldownUntil && Date.now() < new Date(settings.cooldownUntil).getTime()) {
    detail.cooldownUntil = settings.cooldownUntil;
    return { status, enteredStandby: false, promoted: false, detail };
  }

  let enteredStandby = false;
  let promoted = false;
  let recoveredToNormal = false;

  const initialMode = settings.siteMode;

  if (
    initialMode === 'standby' &&
    status !== null &&
    status < 500 &&
    brainRecommendsReturnNormal(brain)
  ) {
    await setSiteMode('normal');
    await syncEdgeConfigSiteState({ siteMode: 'normal', canonicalHost: null });
    await patchSettings({ consecutiveHealthFailures: 0 });
    await appendAudit('brain_return_normal', { summary: brain?.summary, confidence: brain?.confidence });
    recoveredToNormal = true;
    settings = await getSettings();
    detail.recoveredToNormal = true;
  }

  const ruleStandby = failures >= threshold && settings.siteMode === 'normal';
  const brainStandby = brainRecommendsStandby(brain);
  const shouldEnterStandby = !recoveredToNormal && settings.siteMode === 'normal' && (ruleStandby || brainStandby);

  if (shouldEnterStandby) {
    await setSiteMode('standby');
    const edge = await syncEdgeConfigSiteState({ siteMode: 'standby', canonicalHost: null });
    if (!edge.ok && edge.error) detail.edgeError = edge.error;
    await appendAudit('auto_standby', { status, failures, ruleStandby, brainStandby, edgeSkipped: edge.skipped });
    enteredStandby = true;

    const pool = await listDomains();
    const preferred = pickPromoteHostname(brain, pool);
    const sorted = pool
      .filter((d) => d.status === 'standby')
      .sort((a, b) => b.priority - a.priority || a.hostname.localeCompare(b.hostname));
    const nextHost = preferred ?? sorted[0]?.hostname;
    if (nextHost) {
      const r = await promoteStandbyDomain(nextHost);
      promoted = r.ok;
      detail.promote = r;
    }
  } else if (!recoveredToNormal && initialMode === 'standby') {
    const pool = await listDomains();
    const host = pickPromoteHostname(brain, pool);
    if (host) {
      const r = await promoteStandbyDomain(host);
      promoted = r.ok;
      detail.promoteWhileStandby = r;
    }
  }

  if (enteredStandby || promoted) {
    await sendAutoPaymentIfConfigured({
      reason: 'pipeline',
      meta: { enteredStandby, promoted, recoveredToNormal },
    });
  }

  await appendAudit('health_watch', detail);
  return { status, enteredStandby, promoted, detail };
}
