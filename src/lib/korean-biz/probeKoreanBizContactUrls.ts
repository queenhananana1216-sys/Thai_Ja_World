import 'server-only';

import { buildWhatsAppUrlFromPhone } from '@/lib/korean-biz/publicContact';
import { createServiceRoleClient } from '@/lib/supabase/admin';

const TIMEOUT_MS = 10_000;

export async function probeHttpOk(url: string): Promise<boolean> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'User-Agent': 'LivingInThaiContactProbeBot/1.0' },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'User-Agent': 'LivingInThaiContactProbeBot/1.0', Range: 'bytes=0-0' },
      });
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 단일 행 LINE·WhatsApp URL(+전화 기반 wa.me) 점검 후 contact_* 갱신 (Contact-Check-Bot와 동일 로직) */
export async function probeAndPersistKoreanBizContacts(businessId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from('korean_businesses')
    .select('id, line_url, whatsapp_url, phone')
    .eq('id', businessId)
    .maybeSingle();
  if (error || !row) return false;

  const line = typeof row.line_url === 'string' ? row.line_url.trim() : '';
  const wa = typeof row.whatsapp_url === 'string' ? row.whatsapp_url.trim() : '';
  const phone = typeof row.phone === 'string' ? row.phone : '';
  const waFromPhone = buildWhatsAppUrlFromPhone(phone || null);
  const targets = [line, wa].filter((u) => /^https?:\/\//i.test(u));
  if (!targets.length && waFromPhone) targets.push(waFromPhone);
  if (!targets.length) {
    const now = new Date().toISOString();
    const { error: clearErr } = await admin
      .from('korean_businesses')
      .update({ contact_link_ok: null, contact_checked_at: now })
      .eq('id', businessId);
    return !clearErr;
  }

  let ok = true;
  for (const u of targets) {
    const alive = await probeHttpOk(u);
    if (!alive) {
      ok = false;
      break;
    }
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from('korean_businesses')
    .update({ contact_link_ok: ok, contact_checked_at: now })
    .eq('id', businessId);
  return !upErr;
}
