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
import { hashPostOwnerPassword } from '@/lib/community/postOwnerPassword';
import { logSupabaseWriteFailure, shouldMaskRawDbError } from '@/lib/db/dbErrorDefense';
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
  | 'scam'
  | 'schema_sync';

export type PostPipelineResult =
  | { ok: true; postId: string }
  | {
      ok: false;
      status: number;
      code: ModerationErrorCode;
      message?: string;
      /** PostgREST / Postgres 부가 필드(쓰기 실패 시 디버깅) */
      supabase?: { code?: string; details?: string; hint?: string };
    };

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
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string | null;
    /** 선택: 글 비밀번호(4~128자). 설정 시 삭제·수정·비공개 전환 시 필요 */
    owner_password?: string;
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
    if (shouldMaskRawDbError(msg)) {
      logSupabaseWriteFailure('createModeratedPost loadProfile', { message: msg });
      return { ok: false, status: 503, code: 'schema_sync', message: msg };
    }
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
  const ownerPassword =
    typeof body.owner_password === 'string' ? body.owner_password.trim() : '';
  const latitude = typeof body.latitude === 'number' ? body.latitude : null;
  const longitude = typeof body.longitude === 'number' ? body.longitude : null;
  const locationName =
    typeof body.location_name === 'string' ? body.location_name.trim() : null;
  if (ownerPassword) {
    if (ownerPassword.length < 4 || ownerPassword.length > 128) {
      return {
        ok: false,
        status: 400,
        code: 'invalid',
        message: '글 비밀번호는 4자 이상 128자 이하로 정해 주세요.',
      };
    }
  }
  if ((latitude === null) !== (longitude === null)) {
    return { ok: false, status: 400, code: 'invalid', message: 'lat_lng_pair_required' };
  }
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { ok: false, status: 400, code: 'invalid', message: 'invalid_latitude' };
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { ok: false, status: 400, code: 'invalid', message: 'invalid_longitude' };
  }
  if (locationName && locationName.length > 120) {
    return { ok: false, status: 400, code: 'invalid', message: 'location_name_too_long' };
  }

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
      latitude,
      longitude,
      location_name: locationName || null,
      is_anonymous: false,
      moderation_status: 'safe',
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    const raw = insErr?.message ?? 'insert failed';
    logSupabaseWriteFailure('createModeratedPost posts.insert', {
      message: raw,
      code: insErr?.code,
      details: insErr?.details,
      hint: insErr?.hint,
    });
    if (shouldMaskRawDbError(raw)) {
      return {
        ok: false,
        status: 503,
        code: 'schema_sync',
        message: raw,
        supabase: insErr
          ? { code: insErr.code, details: insErr.details, hint: insErr.hint }
          : undefined,
      };
    }
    return {
      ok: false,
      status: 500,
      code: 'server',
      message: raw,
      supabase: insErr
        ? { code: insErr.code, details: insErr.details, hint: insErr.hint }
        : undefined,
    };
  }

  const newId = String(inserted.id);

  if (ownerPassword) {
    const hash = hashPostOwnerPassword(ownerPassword);
    const { error: secErr } = await admin.from('post_edit_secrets').insert({
      post_id: newId,
      password_hash: hash,
    });
    if (secErr) {
      await admin.from('posts').delete().eq('id', newId);
      const raw = secErr.message ?? 'post_edit_secrets insert failed';
      logSupabaseWriteFailure('createModeratedPost post_edit_secrets.insert', {
        message: raw,
        code: secErr.code,
        details: secErr.details,
        hint: secErr.hint,
      });
      if (shouldMaskRawDbError(raw)) {
        return {
          ok: false,
          status: 503,
          code: 'schema_sync',
          message: raw,
          supabase: { code: secErr.code, details: secErr.details, hint: secErr.hint },
        };
      }
      return {
        ok: false,
        status: 500,
        code: 'server',
        message: raw,
        supabase: { code: secErr.code, details: secErr.details, hint: secErr.hint },
      };
    }
    const { error: flagErr } = await admin
      .from('posts')
      .update({ owner_edit_password_set: true })
      .eq('id', newId);
    if (flagErr) {
      await admin.from('post_edit_secrets').delete().eq('post_id', newId);
      await admin.from('posts').delete().eq('id', newId);
      const raw = flagErr.message ?? 'owner flag update failed';
      logSupabaseWriteFailure('createModeratedPost posts.owner_edit_password_set', {
        message: raw,
        code: flagErr.code,
        details: flagErr.details,
        hint: flagErr.hint,
      });
      if (shouldMaskRawDbError(raw)) {
        return {
          ok: false,
          status: 503,
          code: 'schema_sync',
          message: raw,
          supabase: { code: flagErr.code, details: flagErr.details, hint: flagErr.hint },
        };
      }
      return {
        ok: false,
        status: 500,
        code: 'server',
        message: raw,
        supabase: { code: flagErr.code, details: flagErr.details, hint: flagErr.hint },
      };
    }
  }

  return { ok: true, postId: newId };
}
