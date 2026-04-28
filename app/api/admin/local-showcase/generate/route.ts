import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { generateLocalShowcaseDraft } from '@/lib/localShowcase/generateTemplateDraft';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

function isAllowed(email?: string) {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const allowed = parseAdminAllowedEmails();
  if (allowed.length === 0) return true;
  return allowed.includes(e);
}

export async function POST(req: Request) {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!isAllowed(user?.email)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { localSpotId?: string } | null;
  const localSpotId = String(body?.localSpotId ?? '').trim();
  if (!localSpotId) return NextResponse.json({ error: 'localSpotId가 필요합니다.' }, { status: 400 });

  try {
    const draft = await generateLocalShowcaseDraft({ localSpotId });
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'generate_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
