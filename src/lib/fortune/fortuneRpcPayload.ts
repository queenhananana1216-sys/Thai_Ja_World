/**
 * PostgREST·프록시가 jsonb를 문자열로 감싸는 경우 등 방어적 파싱.
 */

export type FortuneTipShape = { id?: string; body?: string; sourcePostId?: string | null };

export type NormalizedFortuneSuccess = {
  ok: true;
  tip?: FortuneTipShape;
  amount?: number;
  thai_balance?: number;
  dotori_balance?: number;
  bangkok_date?: string;
};

export type NormalizedFortuneFailure = {
  ok: false;
  reason?: string;
  message?: string;
};

export type NormalizedFortunePayload = NormalizedFortuneSuccess | NormalizedFortuneFailure;

function coerceBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** RPC / API 응답을 클라이언트·라우트 공통 형으로 정규화 */
export function normalizeFortuneRpcPayload(raw: unknown): NormalizedFortunePayload | null {
  if (raw == null) return null;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const ok = coerceBool(o.ok);
  if (!ok) {
    return {
      ok: false,
      reason: typeof o.reason === 'string' ? o.reason : undefined,
      message: typeof o.message === 'string' ? o.message : undefined,
    };
  }
  const tipRaw = o.tip;
  const tip =
    tipRaw && typeof tipRaw === 'object'
      ? (tipRaw as FortuneTipShape)
      : tipRaw && typeof tipRaw === 'string'
        ? (() => {
            try {
              return JSON.parse(tipRaw) as FortuneTipShape;
            } catch {
              return undefined;
            }
          })()
        : undefined;
  const amount = typeof o.amount === 'number' && Number.isFinite(o.amount) ? o.amount : undefined;
  const thai =
    typeof o.thai_balance === 'number' && Number.isFinite(o.thai_balance)
      ? o.thai_balance
      : typeof o.dotori_balance === 'number' && Number.isFinite(o.dotori_balance)
        ? o.dotori_balance
        : undefined;
  return {
    ok: true,
    tip,
    amount,
    thai_balance: thai,
    bangkok_date: typeof o.bangkok_date === 'string' ? o.bangkok_date : undefined,
  };
}
