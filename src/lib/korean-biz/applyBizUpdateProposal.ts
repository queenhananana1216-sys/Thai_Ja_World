import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { probeAndPersistKoreanBizContacts } from '@/lib/korean-biz/probeKoreanBizContactUrls';

function deriveWhatsappUrlFromPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const compact = phone.replace(/[\s\-().]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d{8,15}$/.test(digits)) return null;
  if (digits.startsWith('66')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0') && digits.length >= 9) return `https://wa.me/66${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export async function applyBizUpdateProposal(input: {
  proposalId: string;
  profileId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createServiceRoleClient();
  const { data: prop, error: pErr } = await sb
    .from('biz_update_proposals')
    .select('*')
    .eq('id', input.proposalId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pErr) return { ok: false, error: pErr.message };
  if (!prop) return { ok: false, error: 'proposal_not_found_or_not_pending' };

  const bid = String((prop as { korean_business_id: string }).korean_business_id);
  const kind = String((prop as { proposal_kind: string }).proposal_kind);
  const meta = ((prop as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<
    string,
    unknown
  >;

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { last_verified_at: now };

  switch (kind) {
    case 'address':
      patch.address = (prop as { proposed_value: string | null }).proposed_value;
      break;
    case 'phone': {
      const newPhone = (prop as { proposed_value: string | null }).proposed_value;
      patch.phone = newPhone;
      const wa = deriveWhatsappUrlFromPhone(newPhone);
      if (wa) patch.whatsapp_url = wa;
      break;
    }
    case 'name':
      patch.name = (prop as { proposed_value: string | null }).proposed_value;
      break;
    case 'coordinates': {
      const lat = typeof meta.latitude === 'number' ? meta.latitude : Number(meta.latitude);
      const lng = typeof meta.longitude === 'number' ? meta.longitude : Number(meta.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ok: false, error: 'coordinates_metadata_invalid' };
      }
      patch.latitude = lat;
      patch.longitude = lng;
      break;
    }
    case 'operational_status': {
      const v = meta.is_verified;
      patch.is_verified = v === true;
      break;
    }
    case 'place_not_found':
      patch.is_verified = false;
      break;
    case 'google_place_id': {
      const nid =
        typeof meta.new_google_place_id === 'string'
          ? meta.new_google_place_id.trim()
          : String((prop as { proposed_value: string | null }).proposed_value ?? '').trim();
      if (!nid) return { ok: false, error: 'missing_new_place_id' };
      patch.google_place_id = nid;
      break;
    }
    default:
      return { ok: false, error: `unknown_proposal_kind:${kind}` };
  }

  const { error: uErr } = await sb.from('korean_businesses').update(patch).eq('id', bid);
  if (uErr) return { ok: false, error: uErr.message };

  await probeAndPersistKoreanBizContacts(bid);

  const { error: cErr } = await sb
    .from('biz_update_proposals')
    .update({
      status: 'applied',
      applied_at: now,
      applied_by_profile_id: input.profileId,
    })
    .eq('id', input.proposalId)
    .eq('status', 'pending');
  if (cErr) return { ok: false, error: cErr.message };

  return { ok: true };
}

export async function dismissBizUpdateProposal(
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createServiceRoleClient();
  const { error } = await sb
    .from('biz_update_proposals')
    .update({ status: 'dismissed' })
    .eq('id', proposalId)
    .eq('status', 'pending');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
