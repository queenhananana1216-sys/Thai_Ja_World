'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from '@/lib/adminAuth';
import { runPipelineTool } from '@/lib/tools/registry';

async function assertAdmin(): Promise<void> {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect('/admin/login');
  }
}

export type MetaDraftState =
  | null
  | {
      ok: true;
      out: { title: string; description: string; note: string; memoryIds?: string[] };
    }
  | { ok: false; error: string };

/** 관리 UI — seo.metaDraft (외장 메모리 + 로컬 Ollama) — 클라이언트는 이 파일만 참조 */
export async function runMetaDraftAction(
  _prev: MetaDraftState,
  formData: FormData,
): Promise<MetaDraftState> {
  await assertAdmin();
  const path = String(formData.get('path') ?? '/').trim() || '/';
  const memoryQuery = String(formData.get('memoryQuery') ?? '').trim() || undefined;
  const locale = String(formData.get('locale') ?? '').trim() || undefined;
  try {
    const out = (await runPipelineTool('seo.metaDraft', {
      path,
      memoryQuery,
      locale,
    })) as { title: string; description: string; note: string; memoryIds?: string[] };
    return { ok: true, out };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
