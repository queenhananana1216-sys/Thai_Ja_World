import 'server-only';

import { randomUUID } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { BizProposalKind } from '@/lib/korean-biz/bizProposalWitty';
import { wittyBizProposalCopy } from '@/lib/korean-biz/bizProposalWitty';
import {
  mergeDetailIntoChange,
  normalizeAddr,
  normalizePhone,
  placesDetails,
  sleep,
  type KoreanBizCategory,
  type KoreanBizRegion,
} from '@/lib/korean-biz/bizRadarPlaces';

const REGION_ORDER: KoreanBizRegion[] = ['bangkok', 'pattaya', 'chiangmai'];
const INTER_REGION_MS = 1_200;
const INTER_ROW_MS = 260;

export type BizRadarAuditResult = {
  audit_batch_id: string;
  scanned: number;
  proposals_upserted: number;
  stamp_no_change: number;
  place_not_found: number;
  errors: string[];
};

type Row = {
  id: string;
  google_place_id: string;
  name: string;
  category: KoreanBizCategory;
  region: KoreanBizRegion;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  last_verified_at: string | null;
};

async function replacePendingProposal(input: {
  sb: ReturnType<typeof createServiceRoleClient>;
  batchId: string;
  row: Row;
  kind: BizProposalKind;
  current_value: string | null;
  proposed_value: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const { sb, batchId, row, kind, current_value, proposed_value, metadata } = input;
  const w = wittyBizProposalCopy(kind, row.name);
  await sb
    .from('biz_update_proposals')
    .delete()
    .eq('korean_business_id', row.id)
    .eq('proposal_kind', kind)
    .eq('status', 'pending');

  const { error } = await sb.from('biz_update_proposals').insert({
    korean_business_id: row.id,
    audit_batch_id: batchId,
    proposal_kind: kind,
    current_value,
    proposed_value,
    metadata: metadata ?? {},
    source: 'google_places',
    witty_headline: w.headline,
    witty_sub: w.sub,
    status: 'pending',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 2주 감사용: korean_businesses 전 행을 Places Details와 대조하되,
 * 불일치 시 DB를 직접 고치지 않고 biz_update_proposals 에만 적재합니다.
 */
export async function runBizRadarAuditCron(): Promise<BizRadarAuditResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const batchId = randomUUID();
  const out: BizRadarAuditResult = {
    audit_batch_id: batchId,
    scanned: 0,
    proposals_upserted: 0,
    stamp_no_change: 0,
    place_not_found: 0,
    errors: [],
  };

  if (!apiKey) {
    out.errors.push('missing_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    return out;
  }

  const sb = createServiceRoleClient();

  for (let ri = 0; ri < REGION_ORDER.length; ri += 1) {
    const region = REGION_ORDER[ri]!;
    const { data: regionRows, error: listErr } = await sb
      .from('korean_businesses')
      .select(
        'id, google_place_id, name, category, region, address, phone, latitude, longitude, is_verified, last_verified_at',
      )
      .eq('region', region);

    if (listErr) {
      out.errors.push(`list_${region}: ${listErr.message}`);
      await sleep(INTER_REGION_MS);
      continue;
    }

    for (const raw of regionRows ?? []) {
      const row = raw as Row;
      out.scanned += 1;
      try {
        const data = await placesDetails({ apiKey, placeId: row.google_place_id });
        await sleep(INTER_ROW_MS);

        if (data.status === 'NOT_FOUND') {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'place_not_found',
            current_value: `place_id:${row.google_place_id}`,
            proposed_value: 'GOOGLE_NOT_FOUND — 수동 확인·폐업 처리 후보',
            metadata: { previous_is_verified: row.is_verified },
          });
          if (rep.ok) {
            out.proposals_upserted += 1;
            out.place_not_found += 1;
          } else if (rep.error) {
            out.errors.push(`place_not_found ${row.id}: ${rep.error}`);
          }
          continue;
        }

        if (data.status !== 'OK' || !data.result) {
          out.errors.push(`details ${row.google_place_id}: ${data.error_message ?? data.status}`);
          continue;
        }

        const detail = data.result;
        const merged = mergeDetailIntoChange({
          existingAddress: row.address,
          existingPhone: row.phone,
          existingName: row.name,
          existingLat: row.latitude,
          existingLng: row.longitude,
          existingIsVerified: row.is_verified,
          detail,
        });

        const canonicalId = (detail.google_resource_id ?? detail.place_id ?? row.google_place_id).trim();
        let newPlaceId: string | undefined;
        if (canonicalId !== row.google_place_id) {
          const { data: other } = await sb
            .from('korean_businesses')
            .select('id')
            .eq('google_place_id', canonicalId)
            .maybeSingle();
          const oid = other as { id: string } | null;
          if (!oid) newPlaceId = canonicalId;
          else if (oid.id !== row.id) {
            out.errors.push(`place_id remap skipped ${row.google_place_id} → ${canonicalId}: row exists`);
          }
        }

        const addrChanged = normalizeAddr(merged.address) !== normalizeAddr(row.address);
        const phoneChanged = normalizePhone(merged.phone ?? '') !== normalizePhone(row.phone ?? '');
        const nameChanged = merged.name.trim() !== row.name.trim();
        const lat = merged.latitude;
        const lng = merged.longitude;
        const latChanged =
          lat != null && row.latitude != null && Math.abs(lat - row.latitude) > 1e-5;
        const lngChanged =
          lng != null && row.longitude != null && Math.abs(lng - row.longitude) > 1e-5;
        const coordInserted =
          (row.latitude == null || row.longitude == null) && lat != null && lng != null;
        const coordChanged = latChanged || lngChanged || coordInserted;
        const verifiedChanged = merged.isVerified !== row.is_verified;

        let wrote = 0;
        if (addrChanged) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'address',
            current_value: row.address,
            proposed_value: merged.address,
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`address ${row.id}: ${rep.error}`);
        }
        if (phoneChanged) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'phone',
            current_value: row.phone,
            proposed_value: merged.phone,
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`phone ${row.id}: ${rep.error}`);
        }
        if (nameChanged) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'name',
            current_value: row.name,
            proposed_value: merged.name,
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`name ${row.id}: ${rep.error}`);
        }
        if (coordChanged && lat != null && lng != null) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'coordinates',
            current_value: `${row.latitude ?? 'null'},${row.longitude ?? 'null'}`,
            proposed_value: `${lat},${lng}`,
            metadata: { latitude: lat, longitude: lng },
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`coordinates ${row.id}: ${rep.error}`);
        }
        if (verifiedChanged) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'operational_status',
            current_value: row.is_verified ? 'verified_open' : 'flagged_closed',
            proposed_value: merged.isVerified ? 'verified_open' : 'flagged_closed',
            metadata: { is_verified: merged.isVerified },
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`operational_status ${row.id}: ${rep.error}`);
        }
        if (newPlaceId) {
          const rep = await replacePendingProposal({
            sb,
            batchId,
            row,
            kind: 'google_place_id',
            current_value: row.google_place_id,
            proposed_value: newPlaceId,
            metadata: { new_google_place_id: newPlaceId },
          });
          if (rep.ok) wrote += 1;
          else if (rep.error) out.errors.push(`google_place_id ${row.id}: ${rep.error}`);
        }

        out.proposals_upserted += wrote;
        const touchedFields =
          addrChanged ||
          phoneChanged ||
          nameChanged ||
          coordChanged ||
          verifiedChanged ||
          Boolean(newPlaceId);
        if (wrote === 0 && !touchedFields && data.status === 'OK') {
          out.stamp_no_change += 1;
        }
      } catch (e) {
        out.errors.push(`audit ${row.google_place_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (ri < REGION_ORDER.length - 1) {
      await sleep(INTER_REGION_MS);
    }
  }

  return out;
}
