import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BALANCE_POLL_TEMPLATES } from '@/lib/cron/autoPollTemplates';

function todaySeoulDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function pickTemplate(seedDay: string) {
  const h = [...seedDay].reduce((a, c) => a + c.charCodeAt(0), 0);
  return BALANCE_POLL_TEMPLATES[h % BALANCE_POLL_TEMPLATES.length]!;
}

/**
 * 서울 당일 `active_on` 행이 없으면 봇이 양자택일 1건 삽입.
 * `polls.active_on` 유니크 — 하루 1문항.
 */
export async function ensureDailyBalancePoll(
  admin: SupabaseClient,
  createdBy: string | null,
): Promise<{ ok: true; skipped?: string; id?: string; active_on?: string } | { ok: false; error: string }> {
  const activeOn = todaySeoulDateString();

  const { data: existing, error: exErr } = await admin
    .from('polls')
    .select('id')
    .eq('active_on', activeOn)
    .maybeSingle();

  if (exErr) return { ok: false, error: exErr.message };
  if (existing?.id) {
    return { ok: true, skipped: 'already_exists', id: String(existing.id), active_on: activeOn };
  }

  const t = pickTemplate(activeOn);
  const { data: inserted, error: insErr } = await admin
    .from('polls')
    .insert({
      question: t.question,
      option_a_label: t.optionA,
      option_b_label: t.optionB,
      active_on: activeOn,
      created_by: createdBy,
      source: 'auto_cron',
    })
    .select('id')
    .maybeSingle();

  if (insErr) {
    if (insErr.code === '23505') {
      return { ok: true, skipped: 'race_duplicate', active_on: activeOn };
    }
    return { ok: false, error: insErr.message };
  }

  const id = inserted?.id != null ? String(inserted.id) : undefined;
  return { ok: true, id, active_on: activeOn };
}
