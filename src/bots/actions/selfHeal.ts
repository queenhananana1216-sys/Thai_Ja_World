/**
 * selfHeal.ts — 봇 셀프힐링 정책 핸들러 (태자 월드)
 *
 * 동작 흐름:
 *   1. BOT_POLICY_MODE 환경 변수 읽기 (기본: 'manual')
 *   2. auto 모드: action_type=heal, dry_run=true 기록 + 선택적 Slack 알림
 *   3. manual 모드: action_type=heal, status=skipped 기록 + 선택적 Slack 알림
 *
 * 보안 주의:
 *   - SLACK_WEBHOOK_URL 은 반드시 https://hooks.slack.com/ 으로 시작해야 합니다.
 *     (SSRF 방지: 임의 내부 엔드포인트로의 요청 차단)
 *   - 이 파일을 클라이언트 번들에 포함하지 마세요 ('server-only' 가드 적용).
 */

/** 봇 전용 — server-only 생략(tsx CLI 호환) */
import { randomUUID } from 'node:crypto';
import { logFail, logSkip, logStart, logSuccess } from '../logging/botActionLogger';
import type { BotPolicyMode, IncidentSignal } from '../types/botTypes';

const BOT_NAME = 'self_healer' as const;

function incidentTypeKo(type: IncidentSignal['type']): string {
  switch (type) {
    case 'high_error_rate':
      return '오류율 급증';
    case 'service_unreachable':
      return '서비스 연결 불가';
    case 'bot_failed_streak':
      return '봇 연속 실패';
    default:
      return String(type);
  }
}

function severityKo(severity: IncidentSignal['severity']): string {
  if (severity === 1) return '긴급(1)';
  if (severity === 2) return '주의(2)';
  return '안내(3)';
}

/** Slack 본문용 — 사용자에게 보이는 문구만 한국어로 통일 */
function formatIncidentSlackLines(signal: IncidentSignal, runId: string): string {
  return [
    `• 유형: ${incidentTypeKo(signal.type)}`,
    `• 심각도: ${severityKo(signal.severity)}`,
    `• 실행 ID: \`${runId}\``,
  ].join('\n');
}

// ── Slack 알림 (선택적) ───────────────────────────────────────────────────

/**
 * SLACK_WEBHOOK_URL 이 설정된 경우에만 메시지를 전송합니다.
 * 허용되지 않는 호스트로의 요청은 거부합니다 (SSRF 방지).
 */
async function sendSlackAlert(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return; // env 미설정 시 no-op

  // SSRF 방지: Slack 공식 webhook 호스트만 허용
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    console.warn(
      '[SelfHeal] SLACK_WEBHOOK_URL 이 허용된 도메인(hooks.slack.com)이 아닙니다. 알림 건너뜀.',
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
      console.warn('[SelfHeal] Slack 전송 실패 status=%d', res.status);
    }
  } catch (err) {
    // 알림 실패는 봇 실행을 막아서는 안 됨
    console.warn('[SelfHeal] Slack 전송 오류:', err instanceof Error ? err.message : err);
  }
}

// ── 결과 타입 ─────────────────────────────────────────────────────────────

export interface HealResult {
  run_id: string;
  policy_mode: BotPolicyMode;
  action_taken: 'healed' | 'skipped';
  reason?: string;
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────

/**
 * handleIncident
 *
 * 인시던트 신호를 받아 정책 모드에 따라 처리하고 결과를 반환합니다.
 *
 * @param signal   인시던트 정보 (type, severity, details)
 * @param runId    선택적 run_id (미전달 시 새 UUID 생성)
 */
export async function handleIncident(
  signal: IncidentSignal,
  runId?: string,
): Promise<HealResult> {
  const run_id = runId ?? randomUUID();

  // 환경 변수에서 정책 모드 읽기; 허용값 외 값은 'manual' 로 폴백
  const rawMode = process.env.BOT_POLICY_MODE ?? 'manual';
  const policy_mode: BotPolicyMode = rawMode === 'auto' ? 'auto' : 'manual';

  const incidentLabelLog = `type=${signal.type} severity=${signal.severity}`;
  console.warn(`[SelfHeal] 인시던트 감지 — ${incidentLabelLog} policy=${policy_mode}`);

  // ── auto 모드 ──────────────────────────────────────────────────────────
  if (policy_mode === 'auto') {
    const rowId = await logStart({
      run_id,
      bot_name: BOT_NAME,
      action_type: 'heal',
      objective: '자동 자가 복구 (dry-run)',
      target_entity: 'infra',
      priority: 1,
      input_payload: {
        incident_type: signal.type,
        severity: signal.severity,
        details: signal.details,
        dry_run: true,
      },
    });

    if (rowId) {
      await logSuccess(rowId, {
        output_payload: {
          dry_run: true,
          message: `인시던트 '${signal.type}' 감지 → 복구 플랜 기록 완료 (Phase 3 실행 예정)`,
          suggested_action:
            signal.type === 'high_error_rate'
              ? 'restart_failing_workers'
              : signal.type === 'service_unreachable'
                ? 'failover_to_replica'
                : 'pause_bot_and_alert',
        },
        metrics_after: {
          heal_triggered: true,
          incident_type: signal.type,
          severity: signal.severity,
        },
      });
    } else {
      // logStart 실패 시에도 Slack 알림은 전송
      console.error('[SelfHeal] logStart 실패 — Slack 알림만 전송');
    }

    await sendSlackAlert(
      `🚨 *태자월드 봇* — 인시던트 감지 (자동 복구 연습 모드)\n` +
        `${formatIncidentSlackLines(signal, run_id)}\n` +
        `• 안내: 아직 실제 조치는 하지 않고 기록만 합니다. 이후 단계에서 자동 복구를 연결할 예정입니다.`,
    );

    return { run_id, policy_mode, action_taken: 'healed' };
  }

  // ── manual 모드 ────────────────────────────────────────────────────────
  const skipReason =
    `BOT_POLICY_MODE=manual: 인시던트 '${signal.type}'(severity=${signal.severity}) 은 ` +
    `수동 검토가 필요합니다.`;

  const rowId = await logStart({
    run_id,
    bot_name: BOT_NAME,
    action_type: 'heal',
    objective: '수동 검토 대기 (manual 정책)',
    target_entity: 'infra',
    priority: 1,
    input_payload: {
      incident_type: signal.type,
      severity: signal.severity,
      details: signal.details,
    },
  });

  if (rowId) {
    await logSkip(rowId, skipReason);
  }

  await sendSlackAlert(
    `⚠️ *태자월드 봇* — 인시던트 수동 검토 필요\n` +
      `${formatIncidentSlackLines(signal, run_id)}\n` +
      `• 자동 복구: 꺼짐 (환경 변수 \`BOT_POLICY_MODE=manual\`)\n` +
      `• 대시보드·로그에서 원인 확인 후 조치해 주세요.`,
  );

  return {
    run_id,
    policy_mode,
    action_taken: 'skipped',
    reason: skipReason,
  };
}

/**
 * createMockIncident — 테스트/개발용 인시던트 신호 생성 헬퍼
 */
export function createMockIncident(
  type: IncidentSignal['type'] = 'bot_failed_streak',
  severity: IncidentSignal['severity'] = 2,
): IncidentSignal {
  return {
    type,
    severity,
    details: {
      mock: true,
      consecutive_failures: 5,
      last_failed_at: new Date().toISOString(),
    },
  };
}
