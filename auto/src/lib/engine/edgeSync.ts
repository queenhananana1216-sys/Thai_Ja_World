import 'server-only';
import { patchEdgeConfigItems } from '@/lib/vercel/edgeConfig';
import type { SiteMode } from '@/lib/store/types';

export async function syncEdgeConfigSiteState(input: {
  siteMode: SiteMode;
  canonicalHost?: string | null;
}): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const id = process.env.EDGE_CONFIG_ID?.trim();
  if (!id) return { ok: true, skipped: true };

  const items: Array<{ key: string; value: string }> = [{ key: 'site_mode', value: input.siteMode }];
  if (input.canonicalHost?.trim()) {
    items.push({ key: 'canonical_host', value: input.canonicalHost.trim().toLowerCase() });
  }

  try {
    await patchEdgeConfigItems(id, items);
    return { ok: true, skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, skipped: false, error: msg };
  }
}
