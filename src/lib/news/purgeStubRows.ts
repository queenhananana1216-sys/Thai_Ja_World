import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

const PROCESSED_NEWS_OR =
  'title_kr.ilike.%placeholder%,title_kr.ilike.%TBD%,title_kr.ilike.%coming soon%,' +
  'content_kr.ilike.%placeholder%,title_kr.ilike.%\uB0B4\uC6A9 \uC900\uBE44%,title_kr.ilike.%\uAC00\uACF5 \uC804%,' +
  'title_kr.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%,title_kr.ilike.%\uAC31\uC2E0\uC740 \uC815\uB9D0 \uC5B4\uB835%,' +
  'content_kr.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%,content_kr.ilike.%\uC900\uBE44 \uC911\uC785\uB2C8\uB2E4%,title_kr.ilike.%\uC900\uBE44 \uC911\uC785\uB2C8\uB2E4%';

const PROCESSED_KNOWLEDGE_OR =
  'clean_body.ilike.%placeholder%,clean_body.ilike.%TBD%,clean_body.ilike.%coming soon%,' +
  'clean_body.ilike.%\uB0B4\uC6A9 \uC900\uBE44%,clean_body.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%,clean_body.ilike.%\uC900\uBE44 \uC911\uC785\uB2C8\uB2E4%';

export interface PurgeStubRowsResult {
  processed_news: number;
  processed_knowledge: number;
  errors: string[];
}

export async function purgeStubRows(): Promise<PurgeStubRowsResult> {
  const admin = createServiceRoleClient();
  const out: PurgeStubRowsResult = {
    processed_news: 0,
    processed_knowledge: 0,
    errors: [],
  };

  const tables: Array<{
    table: 'processed_news' | 'processed_knowledge';
    orFilter: string;
    key: 'processed_news' | 'processed_knowledge';
  }> = [
    { table: 'processed_news', orFilter: PROCESSED_NEWS_OR, key: 'processed_news' },
    { table: 'processed_knowledge', orFilter: PROCESSED_KNOWLEDGE_OR, key: 'processed_knowledge' },
  ];

  for (const { table, orFilter, key } of tables) {
    const { data, error } = await admin.from(table).delete().or(orFilter).select('id');
    if (error) {
      out.errors.push(`${key}: ${error.message}`);
      continue;
    }
    out[key] = data?.length ?? 0;
  }

  return out;
}
