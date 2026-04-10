import 'server-only';
import { vercelFetch } from './client';

/**
 * Edge Config 항목 일괄 PATCH (문자열 값).
 * @see https://vercel.com/docs/rest-api/endpoints#edge-config
 */
export async function patchEdgeConfigItems(
  edgeConfigId: string,
  items: Array<{ key: string; value: string }>,
): Promise<void> {
  if (!items.length) return;
  await vercelFetch(`/v1/edge-config/${encodeURIComponent(edgeConfigId)}/items`, {
    method: 'PATCH',
    body: { items: items.map((i) => ({ operation: 'upsert', key: i.key, value: i.value })) },
  });
}
