import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type { PublicSafetyContact, SafetyContactKind } from '@/lib/safety/safetyContactTypes';
import type { Locale } from '@/i18n/types';

function kindOk(k: string): k is SafetyContactKind {
  return [
    'embassy',
    'police',
    'medical',
    'tourist_police',
    'korean_24h',
    'report',
    'other',
  ].includes(k);
}

function vkOk(k: string): k is PublicSafetyContact['valueKind'] {
  return k === 'phone' || k === 'url' || k === 'text';
}

/**
 * 공개 긴급 연락처 — RLS select. env 없으면 [].
 */
export async function fetchPublicSafetyContacts(
  locale: Locale,
  limit = 20,
): Promise<PublicSafetyContact[]> {
  let sb: ReturnType<typeof createServerClient>;
  try {
    sb = createServerClient();
  } catch {
    return [];
  }
  try {
    const { data, error } = await sb
      .from('community_safety_contacts')
      .select(
        'id, kind, label_ko, label_th, value, value_kind, source_url, source_note, href, display_order',
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(limit);

    if (error) return [];
    const rows = (data ?? []) as Array<{
      id: string;
      kind: string;
      label_ko: string;
      label_th: string;
      value: string;
      value_kind: string;
      source_url: string | null;
      source_note: string | null;
      href: string | null;
      display_order: number;
    }>;

    return rows
      .map((r) => {
        const kind = kindOk(r.kind) ? r.kind : 'other';
        const valueKind = vkOk(r.value_kind) ? r.value_kind : 'text';
        return {
          id: String(r.id),
          kind,
          label: locale === 'th' ? r.label_th : r.label_ko,
          value: r.value,
          valueKind,
          sourceUrl: r.source_url,
          sourceNote: r.source_note,
          href: r.href,
          displayOrder: typeof r.display_order === 'number' ? r.display_order : 0,
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  } catch {
    return [];
  }
}
