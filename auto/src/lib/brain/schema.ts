import { z } from 'zod';

/** Vercel AI Gateway + 구조화 출력 — 외부 트래픽 로그 없이 주어진 신호만 사용하도록 유도 */
export const brainDecisionSchema = z.object({
  summary: z.string().max(900),
  traffic_risk: z.enum(['low', 'medium', 'high', 'critical']),
  recommended_action: z.enum([
    'no_change',
    'enter_standby_prepare_failover',
    'promote_next_domain',
    'return_to_normal',
  ]),
  target_hostname: z
    .string()
    .nullable()
    .describe('Pool의 standby 호스트 중 하나이거나, 액션이 promote일 때만 지정'),
  confidence: z.number().min(0).max(1),
});

export type BrainDecision = z.infer<typeof brainDecisionSchema>;
