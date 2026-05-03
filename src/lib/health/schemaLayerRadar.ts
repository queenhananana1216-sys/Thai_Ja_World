import 'server-only';

import { POSTS_INSERT_TYPED_KEYS } from '@/lib/schema-autoform/postsInsertContract';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export type SchemaLayerRadar = {
  ok: boolean;
  /** healthy LED는 유지하고 주황 힌트용 */
  warn: boolean;
  table: string;
  /** DB에만 있고 생성된 Insert 계약에 없음 → supabase gen types 필요 */
  columns_in_db_not_in_types: string[];
  /** 계약에는 있는데 DB에 없음 → 마이그레이션 미적용 */
  columns_in_types_not_in_db: string[];
  error?: string;
  self_heal_hint?: string;
};

/**
 * 프론트(`supabase/types` + `POSTS_INSERT_TYPED_KEYS`)와 실제 DB 컬럼 집합을 비교합니다.
 */
export async function checkPostsSchemaLayerRadar(): Promise<SchemaLayerRadar> {
  const table = 'posts';
  const out: SchemaLayerRadar = {
    ok: true,
    warn: false,
    table,
    columns_in_db_not_in_types: [],
    columns_in_types_not_in_db: [],
  };

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc('schema_radar_public_table_columns', {
      p_table: table,
    });

    if (error) {
      const msg = error.message ?? String(error);
      const missingFn =
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        /schema_radar_public_table_columns/i.test(msg) ||
        /does not exist/i.test(msg);
      if (missingFn) {
        return {
          ...out,
          ok: false,
          warn: true,
          error: 'schema_radar_rpc_missing',
          self_heal_hint:
            'Apply migration 152_schema_radar_public_columns.sql (function schema_radar_public_table_columns).',
        };
      }
      return { ...out, ok: false, warn: true, error: msg };
    }

    if (!Array.isArray(data)) {
      return {
        ...out,
        ok: false,
        warn: true,
        error: 'schema_radar_unexpected_payload',
        self_heal_hint: 'RPC schema_radar_public_table_columns: expected string[] column names.',
      };
    }

    const live = new Set(
      data.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean),
    );

    if (live.size === 0) {
      return {
        ...out,
        ok: false,
        warn: true,
        error: 'schema_radar_empty_columns',
        self_heal_hint: `No columns returned for public.${table} — verify table exists.`,
      };
    }

    const typed = new Set<string>(POSTS_INSERT_TYPED_KEYS as unknown as string[]);

    for (const c of live) {
      if (!typed.has(c)) out.columns_in_db_not_in_types.push(c);
    }
    for (const c of typed) {
      if (!live.has(c)) out.columns_in_types_not_in_db.push(c);
    }

    if (out.columns_in_types_not_in_db.length > 0) {
      out.self_heal_hint = `DB missing columns: ${out.columns_in_types_not_in_db.join(', ')} — apply pending Supabase migrations.`;
    }
    if (out.columns_in_db_not_in_types.length > 0) {
      out.self_heal_hint = [
        out.self_heal_hint,
        `Types stale vs DB — run: npx supabase gen types typescript --linked > supabase/types.ts`,
        `Then sync POSTS_INSERT_TYPED_KEYS (src/lib/schema-autoform/postsInsertContract.ts).`,
        `DB-only columns: ${out.columns_in_db_not_in_types.join(', ')}`,
      ]
        .filter(Boolean)
        .join(' | ');
    }

    out.warn = out.columns_in_db_not_in_types.length > 0 || out.columns_in_types_not_in_db.length > 0;
    out.ok = !out.warn;

    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...out, ok: false, warn: true, error: msg };
  }
}
