import 'server-only';

import {
  isPostingDisabledCategory,
  POST_CATEGORY_SLUGS,
  type PostCategorySlug,
} from '@/lib/community/postCategories';
import { moderatePostContent } from '@/lib/moderation/openaiModeration';
import {
  isPostImageUrlAllowedForUser,
  runLocalPostChecks,
} from '@/lib/moderation/promoAndSpam';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export type ModerationErrorCode =
  | 'auth'
  | 'banned'
  | 'invalid'
  | 'promo'
  | 'nsfw'
  | 'imagePolicy'
  | 'server'
  | 'scam';

export type PostPipelineResult =
  | { ok: true; postId: string }
  | { ok: false; status: number; code: ModerationErrorCode; message?: string };

function isCategory(s: string): s is PostCategorySlug {
  return POST_CATEGORY_SLUGS.includes(s as PostCategorySlug);
}

function numEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function loadProfile(admin: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('banned_until, moderation_strikes')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as {
    banned_until: string | null;
    moderation_strikes: number | null;
  } | null;
}

function isBannedUntil(row: { banned_until: string | null } | null): boolean {
  if (!row?.banned_until) return false;
  return new Date(row.banned_until).getTime() > Date.now();
}

export async function createModeratedPost(
  accessToken: string,
  body: {
    category: string;
    title: string;
    content: string;
    image_urls: string[];
  },
): Promise<PostPipelineResult> {
  const token = accessToken.trim();
  if (!token) {
    return { ok: false, status: 401, code: 'auth' };
  }

  let userId: string;
  try {
    const sb = createSupabaseWithUserJwt(token);
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u.user) {
      return { ok: false, status: 401, code: 'auth' };
    }
    userId = u.user.id;
  } catch {
    return { ok: false, status: 401, code: 'auth' };
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 503, code: 'server', message: msg };
  }

  let profile: Awaited<ReturnType<typeof loadProfile>>;
  try {
    profile = await loadProfile(admin, userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 503, code: 'server', message: msg };
  }

  if (isBannedUntil(profile)) {
    return { ok: false, status: 403, code: 'banned' };
  }

  const category = body.category;
  if (!isCategory(category)) {
    return { ok: false, status: 400, code: 'invalid' };
  }
  if (isPostingDisabledCategory(category)) {
    return {
      ok: false,
      status: 403,
      code: 'invalid',
      message:
        '중고·알바 말머리는 정식 오픈 전까지 새 글만 잠시 닫아 두었어요. 목록 보기와 예전 글 읽기는 그대로 이용하실 수 있어요.',
    };
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const image_urls = Array.isArray(body.image_urls) ? body.image_urls : [];

  if (title.length < 1 || title.length > 200 || content.length < 2) {
    return { ok: false, status: 400, code: 'invalid' };
  }
  if (image_urls.length > 3) {
    return { ok: false, status: 400, code: 'invalid' };
  }

  for (const u of image_urls) {
    if (typeof u !== 'string' || !isPostImageUrlAllowedForUser(u, userId)) {
      return { ok: false, status: 400, code: 'invalid' };
    }
  }

  const local = runLocalPostChecks(title, content, category);
  if (local.kind === 'ban_scam') {
    const hours = numEnv('MODERATION_SCAM_BAN_HOURS', 72);
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    await admin
      .from('profiles')
      .update({ banned_until: until, ban_reason: 'scam_finance_heuristic' })
      .eq('id', userId);
    return { ok: false, status: 403, code: 'scam' };
  }
  if (local.kind === 'reject_promo' || local.kind === 'reject_spam') {
    const strikes = Number(profile?.moderation_strikes ?? 0);
    const delta = local.kind === 'reject_spam' ? 2 : 1;
    const next = strikes + delta;
    await admin.from('profiles').update({ moderation_strikes: next }).eq('id', userId);
    const threshold = numEnv('MODERATION_STRIKE_THRESHOLD', 3);
    if (next >= threshold) {
      const banH = numEnv('MODERATION_STRIKEOUT_BAN_HOURS', 168);
      const until = new Date(Date.now() + banH * 3600_000).toISOString();
      await admin
        .from('profiles')
        .update({ banned_until: until, ban_reason: 'promo_spam_strikes' })
        .eq('id', userId);
    }
    return { ok: false, status: 422, code: 'promo' };
  }

  const ai = await moderatePostContent(title, content, image_urls);
  if ('error' in ai && ai.error === 'IMAGE_REQUIRES_OPENAI') {
    return { ok: false, status: 422, code: 'imagePolicy' };
  }
  if ('error' in ai && ai.error) {
    return {
      ok: false,
      status: 503,
      code: 'server',
      message: ai.detail ?? ai.error,
    };
  }
  if ('flagged' in ai && ai.flagged) {
    const strikes = Number(profile?.moderation_strikes ?? 0);
    const next = strikes + 1;
    await admin.from('profiles').update({ moderation_strikes: next }).eq('id', userId);
    const threshold = numEnv('MODERATION_STRIKE_THRESHOLD', 3);
    if (next >= threshold) {
      const banH = numEnv('MODERATION_STRIKEOUT_BAN_HOURS', 168);
      const until = new Date(Date.now() + banH * 3600_000).toISOString();
      await admin
        .from('profiles')
        .update({ banned_until: until, ban_reason: 'moderation_strikes' })
        .eq('id', userId);
    }
    return { ok: false, status: 422, code: 'nsfw' };
  }

  const { data: inserted, error: insErr } = await admin
    .from('posts')
    .insert({
      author_id: userId,
      category,
      title: title.slice(0, 200),
      content,
      image_urls,
      is_anonymous: false,
      moderation_status: 'safe',
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    return {
      ok: false,
      status: 500,
      code: 'server',
      message: insErr?.message ?? 'insert failed',
    };
  }

  return { ok: true, postId: String(inserted.id) };
}
