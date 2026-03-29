/**
 * 홈 히어로 공개 문구 저장 — 세션 + ADMIN_ALLOWED_EMAILS (관리자 레이아웃과 동일)
 */
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { HERO_SITE_COPY_KEYS, type HeroSiteCopyKey } from '@/lib/siteCopy/heroCopyDefaults';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

const MAX_LEN_SHORT = 200;
const MAX_LEN_BRAND = 160;
const MAX_LEN_SUB = 3000;

type Entry = { key: string; locale: string; value: string };

function maxLenForKey(key: string): number {
  if (key.startsWith('home_hero_brand_')) return MAX_LEN_BRAND;
  if (key === 'home_hero_sub') return MAX_LEN_SUB;
  return MAX_LEN_SHORT;
}

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

function isAllowedKey(key: string, locale: string): key is HeroSiteCopyKey {
  if (!HERO_SITE_COPY_KEYS.includes(key as HeroSiteCopyKey)) return false;
  if (
    key === 'home_hero_title' ||
    key === 'home_hero_tag' ||
    key === 'home_hero_kicker' ||
    key === 'home_hero_lead' ||
    key === 'home_hero_sub'
  ) {
    return locale === 'ko' || locale === 'th';
  }
  return locale === 'ko';
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: { entries?: Entry[] };
  try {
    body = (await req.json()) as { entries?: Entry[] };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const entries = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'entries 배열이 필요합니다.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  for (const raw of entries) {
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    const locale = typeof raw.locale === 'string' ? raw.locale.trim() : '';
    const value = typeof raw.value === 'string' ? raw.value : '';
    if (!key || !locale) {
      return NextResponse.json({ error: '각 항목에 key, locale 이 필요합니다.' }, { status: 400 });
    }
    if (!isAllowedKey(key, locale)) {
      return NextResponse.json({ error: `허용되지 않은 key/locale: ${key} / ${locale}` }, { status: 400 });
    }
    const trimmed = value.trim();
    const cap = maxLenForKey(key);
    if (trimmed.length > cap) {
      return NextResponse.json({ error: `값은 ${cap}자 이하여야 합니다.` }, { status: 400 });
    }

    if (trimmed === '') {
      const { error: delErr } = await admin.from('site_copy').delete().eq('key', key).eq('locale', locale);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }
    } else {
      const { error: upErr } = await admin.from('site_copy').upsert(
        {
          key,
          locale,
          value: trimmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key,locale' },
      );
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
