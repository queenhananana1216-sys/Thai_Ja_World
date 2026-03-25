import 'server-only';

import { moderatePlainText } from '@/lib/moderation/openaiModeration';
import { runLocalPostChecks } from '@/lib/moderation/promoAndSpam';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export type NewsCommentCode =
  | 'auth'
  | 'banned'
  | 'invalid'
  | 'promo'
  | 'nsfw'
  | 'server'
  | 'scam';

export type NewsCommentResult =
  | { ok: true }
  | { ok: false; status: number; code: NewsCommentCode; message?: string };

function numEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function createModeratedNewsComment(
  accessToken: string,
  processedNewsId: string,
  rawContent: string,
): Promise<NewsCommentResult> {
  const token = accessToken.trim();
  if (!token) {
    return { ok: false, status: 401, code: 'auth' };
  }

  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (content.length < 1 || content.length > 4000) {
    return { ok: false, status: 400, code: 'invalid' };
  }

  const sb = createSupabaseWithUserJwt(token);
  const { data: u, error: ue } = await sb.auth.getUser();
  if (ue || !u.user) {
    return { ok: false, status: 401, code: 'auth' };
  }
  const userId = u.user.id;

  const { data: prof, error: pe } = await sb
    .from('profiles')
    .select('banned_until')
    .eq('id', userId)
    .maybeSingle();
  if (pe) {
    return { ok: false, status: 503, code: 'server', message: pe.message };
  }
  if (prof?.banned_until && new Date(prof.banned_until).getTime() > Date.now()) {
    return { ok: false, status: 403, code: 'banned' };
  }

  const { data: story, error: se } = await sb
    .from('processed_news')
    .select('id')
    .eq('id', processedNewsId)
    .eq('published', true)
    .maybeSingle();
  if (se || !story) {
    return { ok: false, status: 404, code: 'invalid' };
  }

  const local = runLocalPostChecks(' ', content, 'free');
  if (local.kind === 'ban_scam') {
    let admin;
    try {
      admin = createServiceRoleClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 503, code: 'server', message: msg };
    }
    const hours = numEnv('MODERATION_SCAM_BAN_HOURS', 72);
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    await admin
      .from('profiles')
      .update({ banned_until: until, ban_reason: 'scam_finance_comment' })
      .eq('id', userId);
    return { ok: false, status: 403, code: 'scam' };
  }
  if (local.kind === 'reject_promo' || local.kind === 'reject_spam') {
    return { ok: false, status: 422, code: 'promo' };
  }

  const ai = await moderatePlainText(content);
  if ('error' in ai && ai.error && ai.error !== 'IMAGE_REQUIRES_OPENAI') {
    return {
      ok: false,
      status: 503,
      code: 'server',
      message: ai.detail ?? ai.error,
    };
  }
  if ('flagged' in ai && ai.flagged) {
    return { ok: false, status: 422, code: 'nsfw' };
  }

  const { error: insErr } = await sb.from('news_comments').insert({
    processed_news_id: processedNewsId,
    author_id: userId,
    content,
  });
  if (insErr) {
    return { ok: false, status: 500, code: 'server', message: insErr.message };
  }

  return { ok: true };
}
