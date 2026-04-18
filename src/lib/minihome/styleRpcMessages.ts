import type { Dictionary } from '@/i18n/dictionaries';

/** Supabase RPC / Postgres raise exception 메시지 → 사용자 문구 */
export function mapStyleRpcError(raw: string | undefined, m: Dictionary['minihome']): string {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('NOT_AUTHENTICATED') || s.includes('JWT')) return m.styleRpcNotAuth;
  if (s.includes('GREETING_ALREADY_DONE')) return m.styleRpcGreetingDone;
  if (s.includes('GREETING_BODY_TOO_SHORT')) return m.styleRpcGreetingShort;
  if (s.includes('GREETING_BODY_TOO_LONG')) return m.styleRpcGreetingLong;
  if (s.includes('ITEM_NOT_FOUND')) return m.styleRpcNoItem;
  if (s.includes('ALREADY_OWNED')) return m.styleRpcOwned;
  if (s.includes('INSUFFICIENT_POINTS')) return m.styleRpcPoor;
  if (s.includes('RENTAL_NOT_AVAILABLE')) return m.styleRpcRentalUnavailable;
  if (s.includes('TIER_DAYS_NOT_MET')) return m.styleRpcTierDays;
  if (s.includes('TIER_GRADE_NOT_MET')) return m.styleRpcTierGrade;
  if (s.includes('NOT_OWNED')) return m.styleRpcNotOwned;
  if (s.includes('DAILY_LIMIT_REACHED') || s.includes('ANTI_ABUSE_REVIEW')) return m.styleRpcAbuseHold;
  if (s.includes('PROFILE_STYLE_OR_GREETING_LOCKED')) return m.styleRpcGeneric;
  return m.styleRpcGeneric;
}
