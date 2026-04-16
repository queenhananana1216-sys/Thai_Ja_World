import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { validateTemplateJson } from '@/lib/localShopTemplates/templateSchema';

export const runtime = 'nodejs';

type Body = {
  action?: 'approve' | 'reject' | 'rollback';
  reviewNote?: string | null;
};

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; draftId: string }> },
) {
  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id, draftId } = await ctx.params;
  const spotId = String(id ?? '').trim();
  const targetDraftId = String(draftId ?? '').trim();
  if (!spotId || !targetDraftId) {
    return NextResponse.json({ error: '가게 id/draft id가 필요합니다.' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }
  const action = body.action ?? 'approve';
  if (!['approve', 'reject', 'rollback'].includes(action)) {
    return NextResponse.json({ error: 'action 은 approve | reject | rollback' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: draft, error: draftErr } = await admin
    .from('local_spot_template_drafts')
    .select('*')
    .eq('id', targetDraftId)
    .eq('local_spot_id', spotId)
    .maybeSingle();
  if (draftErr || !draft) {
    return NextResponse.json({ error: draftErr?.message ?? '초안을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (action === 'reject') {
    const { error: updErr } = await admin
      .from('local_spot_template_drafts')
      .update({
        status: 'rejected',
        reviewed_by: user?.id ?? null,
        review_note: body.reviewNote?.trim() || null,
      })
      .eq('id', targetDraftId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    await admin.from('local_spot_template_audits').insert({
      local_spot_id: spotId,
      draft_id: targetDraftId,
      action: 'reject',
      actor_id: user?.id ?? null,
      payload: { review_note: body.reviewNote?.trim() || null },
    });
    revalidatePath('/admin/local-spots');
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  if (action === 'rollback') {
    const snapshot = (draft.snapshot_before ?? {}) as Record<string, unknown>;
    const hasSnapshot = Object.keys(snapshot).length > 0;
    if (!hasSnapshot) {
      return NextResponse.json({ error: '롤백 가능한 스냅샷이 없습니다.' }, { status: 400 });
    }
    const { error: rbErr } = await admin
      .from('local_spots')
      .update({
        minihome_intro: snapshot.minihome_intro ?? null,
        minihome_theme: snapshot.minihome_theme ?? {},
        minihome_menu: Array.isArray(snapshot.minihome_menu) ? snapshot.minihome_menu : [],
        minihome_layout_modules: Array.isArray(snapshot.minihome_layout_modules)
          ? snapshot.minihome_layout_modules
          : ['intro', 'menu', 'line', 'photos'],
      })
      .eq('id', spotId);
    if (rbErr) return NextResponse.json({ error: rbErr.message }, { status: 500 });
    await admin.from('local_spot_template_audits').insert({
      local_spot_id: spotId,
      draft_id: targetDraftId,
      action: 'rollback',
      actor_id: user?.id ?? null,
      payload: { snapshot_restored: true },
    });
    revalidatePath('/admin/local-spots');
    revalidatePath('/shop', 'layout');
    return NextResponse.json({ ok: true, status: 'rolled_back' });
  }

  const validated = validateTemplateJson(draft.template_json);
  if (!validated.ok) {
    return NextResponse.json(
      { error: `템플릿 검증 실패: ${validated.errors.join(', ')}` },
      { status: 400 },
    );
  }

  const { data: spot, error: spotErr } = await admin
    .from('local_spots')
    .select('minihome_intro, minihome_theme, minihome_menu, minihome_layout_modules')
    .eq('id', spotId)
    .maybeSingle();
  if (spotErr || !spot) {
    return NextResponse.json({ error: spotErr?.message ?? '가게를 찾을 수 없습니다.' }, { status: 404 });
  }

  const snapshotBefore = {
    minihome_intro: spot.minihome_intro,
    minihome_theme: spot.minihome_theme,
    minihome_menu: spot.minihome_menu,
    minihome_layout_modules: spot.minihome_layout_modules,
  };

  const nowIso = new Date().toISOString();
  const { error: applyErr } = await admin
    .from('local_spots')
    .update({
      minihome_intro: validated.data.minihome_intro,
      minihome_theme: validated.data.minihome_theme,
      minihome_menu: validated.data.minihome_menu,
      minihome_layout_modules: validated.data.minihome_layout_modules,
    })
    .eq('id', spotId);
  if (applyErr) return NextResponse.json({ error: applyErr.message }, { status: 500 });

  const { error: draftUpdErr } = await admin
    .from('local_spot_template_drafts')
    .update({
      status: 'applied',
      reviewed_by: user?.id ?? null,
      review_note: body.reviewNote?.trim() || null,
      snapshot_before: snapshotBefore,
      approved_at: nowIso,
      applied_at: nowIso,
    })
    .eq('id', targetDraftId);
  if (draftUpdErr) return NextResponse.json({ error: draftUpdErr.message }, { status: 500 });

  await admin.from('local_spot_template_audits').insert([
    {
      local_spot_id: spotId,
      draft_id: targetDraftId,
      action: 'approve',
      actor_id: user?.id ?? null,
      payload: { review_note: body.reviewNote?.trim() || null },
    },
    {
      local_spot_id: spotId,
      draft_id: targetDraftId,
      action: 'apply',
      actor_id: user?.id ?? null,
      payload: { confidence: draft.confidence ?? null },
    },
  ]);

  revalidatePath('/admin/local-spots');
  revalidatePath('/local');
  revalidatePath('/shop', 'layout');
  return NextResponse.json({ ok: true, status: 'applied' });
}
