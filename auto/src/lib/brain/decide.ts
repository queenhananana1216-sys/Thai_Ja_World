import 'server-only';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { loadPipelineCharter } from '@/lib/charter/loadCharter';
import { isPipelineLocalOnly, shouldIncludeCharterInExternalPrompt } from '@/lib/pipeline/localMode';
import type { DomainPoolRow } from '@/lib/store/types';
import { brainDecisionSchema, type BrainDecision } from './schema';

export type BrainContext = {
  taejaPublicUrl: string;
  lastHttpStatus: number | null;
  consecutiveFailures: number;
  failureThreshold: number;
  siteMode: 'normal' | 'standby';
  domains: DomainPoolRow[];
};

function buildPrompt(ctx: BrainContext, charterAppend: string): string {
  const domainLines = ctx.domains
    .map((d) => `- ${d.hostname} (status=${d.status}, priority=${d.priority})`)
    .join('\n');

  return `You are a site reliability copilot for "taeja-world". You ONLY have the telemetry below. Do NOT invent CDN logs, WAF hits, geographic traffic, or request rates — acknowledge uncertainty when signals are thin.

Telemetry:
- Public URL (HEAD probe only): ${ctx.taejaPublicUrl}
- Last HTTP status from HEAD: ${ctx.lastHttpStatus === null ? 'connection failed' : String(ctx.lastHttpStatus)}
- Consecutive failed probes (5xx or network error): ${ctx.consecutiveFailures}
- Failure threshold (rule engine): ${ctx.failureThreshold}
- Declared site mode: ${ctx.siteMode}
- Domain pool (failover candidates):
${domainLines || '(empty pool)'}
${charterAppend}

Choose the safest operational action. Prefer "no_change" when uncertainty is high. Use "enter_standby_prepare_failover" when failover is prudent. Use "promote_next_domain" only if a specific standby hostname should be promoted next. Use "return_to_normal" only if the service appears healthy and standby should end.

Respond with structured fields only.`;
}

export function trafficRiskToAnomalyScore(risk: BrainDecision['traffic_risk']): number {
  switch (risk) {
    case 'low':
      return 15;
    case 'medium':
      return 45;
    case 'high':
      return 75;
    case 'critical':
      return 100;
    default:
      return 0;
  }
}

function parseMinConf(): number {
  const n = Number(process.env.AUTO_BRAIN_MIN_CONFIDENCE ?? '0.72');
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.72;
}

export function brainRecommendsStandby(d: BrainDecision | null): boolean {
  if (!d) return false;
  const min = parseMinConf();
  if (d.confidence < min) return false;
  if (d.traffic_risk === 'critical' && d.confidence >= min) return true;
  if (d.recommended_action === 'enter_standby_prepare_failover' && d.confidence >= min) return true;
  return false;
}

export function brainRecommendsReturnNormal(d: BrainDecision | null): boolean {
  if (!d) return false;
  const n = Number(process.env.AUTO_BRAIN_RETURN_NORMAL_MIN_CONFIDENCE ?? '0.82');
  const min = Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.82;
  return d.recommended_action === 'return_to_normal' && d.confidence >= min;
}

export function pickPromoteHostname(
  d: BrainDecision | null,
  pool: DomainPoolRow[],
): string | undefined {
  if (!d) return undefined;
  const min = parseMinConf();
  if (d.recommended_action !== 'promote_next_domain' && d.recommended_action !== 'enter_standby_prepare_failover') {
    return undefined;
  }
  if (d.confidence < min) return undefined;
  const host = d.target_hostname?.trim().toLowerCase();
  if (!host) return undefined;
  const match = pool.find((x) => x.hostname === host && x.status === 'standby');
  return match?.hostname;
}

/**
 * Vercel AI Gateway (OpenAI-compatible). AI_GATEWAY_API_KEY 없으면 null.
 * 모델: AUTO_BRAIN_MODEL (기본 openai/gpt-4o) — 게이트웨이에 등록된 강한 모델로 교체 가능.
 */
export async function runBrainDecision(ctx: BrainContext): Promise<BrainDecision | null> {
  if (isPipelineLocalOnly()) {
    return null;
  }

  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!key) return null;

  let charterAppend = '';
  if (shouldIncludeCharterInExternalPrompt()) {
    const { text, found } = loadPipelineCharter();
    if (found && text.trim()) {
      charterAppend = `\n\n--- Charter excerpt (user opted in via AUTO_BRAIN_INCLUDE_CHARTER=1) ---\n${text.slice(0, 2500)}`;
    }
  }

  const modelId = process.env.AUTO_BRAIN_MODEL?.trim() || 'openai/gpt-4o';
  const gateway = createOpenAI({
    apiKey: key,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  try {
    const { object } = await generateObject({
      model: gateway(modelId),
      schema: brainDecisionSchema,
      prompt: buildPrompt(ctx, charterAppend),
      temperature: 0.2,
    });
    return object;
  } catch {
    return null;
  }
}
