/**
 * 로컬 가게(local_spots) CRUD — 관리자 전용
 */

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { resolveUserIdByEmail } from '@/lib/admin/resolveUserIdByEmail';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

type Body = {
  action?: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
  id?: string;
  name?: string;
  slug?: string | null;
  description?: string | null;
  line_url?: string | null;
  photo_urls?: string[];
  category?: string;
  tags?: string[];
  sort_order?: number;
  is_published?: boolean;
  extra?: Record<string, unknown> | null;
  extra_json?: string | null;
  /** create: 연결 없으면 null. update: 필드 생략 시 기존 유지 */
  owner_email?: string | null;
  minihome_public_slug?: string | null;
  minihome_intro?: string | null;
  minihome_theme_json?: string | null;
  minihome_menu_json?: string | null;
  minihome_layout_json?: string | null;
  minihome_extra_json?: string | null;
  minihome_guestbook_enabled?: boolean;
};

const CATEGORIES = ['restaurant', 'cafe', 'night_market', 'service', 'shopping', 'other', 'massage'] as const;

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

function slugBase(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/gi, '')
    .slice(0, 80);
  return s || `spot-${Date.now()}`;
}

function parseExtra(body: Body): Record<string, unknown> {
  if (body.extra && typeof body.extra === 'object') return body.extra;
  const j = body.extra_json?.trim();
  if (!j) return {};
  try {
    const o = JSON.parse(j) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const MINIHOME_SLUG_RE = /^(?:[a-f0-9]{12}|[a-z0-9][a-z0-9_-]{2,38}[a-z0-9])$/;

function normalizeMinihomeSlug(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (s.length < 4 || s.length > 40 || !MINIHOME_SLUG_RE.test(s)) {
    throw new Error('MINIHOME_SLUG_INVALID');
  }
  return s;
}

function parseJsonObject(j: string | null | undefined, fallback: Record<string, unknown>): Record<string, unknown> {
  const t = j?.trim();
  if (!t) return fallback;
  try {
    const o = JSON.parse(t) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : fallback;
  } catch {
    throw new Error('JSON_OBJECT_PARSE');
  }
}

function parseJsonArray(j: string | null | undefined, fallback: unknown[]): unknown[] {
  const t = j?.trim();
  if (!t) return fallback;
  try {
    const o = JSON.parse(t) as unknown;
    return Array.isArray(o) ? o : fallback;
  } catch {
    throw new Error('JSON_ARRAY_PARSE');
  }
}

async function assertMinihomeSlugFree(
  admin: ReturnType<typeof createServiceRoleClient>,
  slug: string,
  excludeId?: string,
) {
  let q = admin.from('local_spots').select('id').eq('minihome_public_slug', slug);
  if (excludeId) q = q.neq('id', excludeId);
  const { data: clash } = await q.maybeSingle();
  if (clash) throw new Error('MINIHOME_SLUG_TAKEN');
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const action = body.action;
  if (
    action !== 'create' &&
    action !== 'update' &&
    action !== 'delete' &&
    action !== 'publish' &&
    action !== 'unpublish'
  ) {
    return NextResponse.json(
      { error: 'action 은 create | update | delete | publish | unpublish' },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();

  if (action === 'publish' || action === 'unpublish') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin
      .from('local_spots')
      .update({ is_published: action === 'publish' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/admin/local-spots');
    revalidatePath('/local');
    revalidatePath('/shop', 'layout');
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin.from('local_spots').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/admin/local-spots');
    revalidatePath('/local');
    revalidatePath('/shop', 'layout');
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name 필수' }, { status: 400 });

  const category =
    typeof body.category === 'string' && (CATEGORIES as readonly string[]).includes(body.category)
      ? body.category
      : 'restaurant';

  const photo_urls = Array.isArray(body.photo_urls)
    ? body.photo_urls.map((u) => String(u).trim()).filter(Boolean)
    : [];

  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [];

  const sort_order =
    typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
      ? Math.floor(body.sort_order)
      : 0;

  const is_published = Boolean(body.is_published);
  const description = body.description === undefined || body.description === null ? null : String(body.description);
  const line_url =
    body.line_url === undefined || body.line_url === null ? null : String(body.line_url).trim() || null;
  const extra = parseExtra(body);

  let minihome_public_slug: string | null;
  let minihome_theme: Record<string, unknown>;
  let minihome_menu: unknown[];
  let minihome_layout: unknown[];
  let minihome_extra: Record<string, unknown>;
  try {
    minihome_public_slug = normalizeMinihomeSlug(
      body.minihome_public_slug === undefined ? null : body.minihome_public_slug,
    );
    minihome_theme = parseJsonObject(body.minihome_theme_json, {});
    minihome_menu = parseJsonArray(body.minihome_menu_json, []);
    minihome_layout = parseJsonArray(body.minihome_layout_json, ['intro', 'menu', 'line', 'photos']);
    minihome_extra = parseJsonObject(body.minihome_extra_json, {});
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'MINIHOME_SLUG_INVALID') {
      return NextResponse.json(
        {
          error:
            '미니홈 공개 슬러그는 4~40자, 소문자·숫자·하이픈·밑줄만(또는 12자리 hex) 가능합니다.',
        },
        { status: 400 },
      );
    }
    if (code === 'JSON_OBJECT_PARSE' || code === 'JSON_ARRAY_PARSE') {
      return NextResponse.json({ error: '테마·메뉴·레이아웃 JSON 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    throw e;
  }

  const minihome_intro =
    body.minihome_intro === undefined || body.minihome_intro === null ? null : String(body.minihome_intro);

  async function resolveOwnerField(): Promise<string | null> {
    const raw = body.owner_email;
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const uid = await resolveUserIdByEmail(admin, s);
    if (!uid) throw new Error('OWNER_EMAIL_NOT_FOUND');
    return uid;
  }

  if (action === 'create') {
    const base =
      typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : slugBase(name);
    let slug = '';
    for (let i = 0; i < 50; i++) {
      const trySlug = i === 0 ? base : `${base}-${i}`;
      const { data: exists } = await admin.from('local_spots').select('id').eq('slug', trySlug).maybeSingle();
      if (!exists) {
        slug = trySlug;
        break;
      }
    }
    if (!slug) slug = `${slugBase(name)}-${randomUUID().slice(0, 8)}`;

    let owner_profile_id: string | null = null;
    try {
      if (Object.prototype.hasOwnProperty.call(body, 'owner_email')) {
        owner_profile_id = await resolveOwnerField();
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'OWNER_EMAIL_NOT_FOUND') {
        return NextResponse.json({ error: '해당 이메일의 가입 사용자가 없습니다.' }, { status: 400 });
      }
      throw e;
    }

    if (minihome_public_slug) {
      try {
        await assertMinihomeSlugFree(admin, minihome_public_slug);
      } catch (e) {
        if (e instanceof Error && e.message === 'MINIHOME_SLUG_TAKEN') {
          return NextResponse.json({ error: '이미 사용 중인 미니홈 공개 슬러그입니다.' }, { status: 400 });
        }
        throw e;
      }
    }

    const minihome_guestbook_enabled =
      typeof body.minihome_guestbook_enabled === 'boolean' ? body.minihome_guestbook_enabled : true;

    const { data: row, error } = await admin
      .from('local_spots')
      .insert({
        slug,
        name,
        description,
        line_url,
        photo_urls,
        category,
        tags,
        sort_order,
        is_published,
        extra,
        owner_profile_id,
        minihome_public_slug,
        minihome_intro,
        minihome_theme,
        minihome_bgm_url: null,
        minihome_menu,
        minihome_layout_modules: minihome_layout,
        minihome_extra,
        minihome_guestbook_enabled,
      })
      .select('id, slug')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/admin/local-spots');
    revalidatePath('/local');
    revalidatePath('/shop', 'layout');
    return NextResponse.json({ ok: true, row });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'update 시 id 필요' }, { status: 400 });

  const patch: Record<string, unknown> = {
    name,
    description,
    line_url,
    photo_urls,
    category,
    tags,
    sort_order,
    is_published,
    extra,
    minihome_intro,
    minihome_theme,
    minihome_menu,
    minihome_layout_modules: minihome_layout,
    minihome_extra,
    minihome_public_slug,
  };

  if (Object.prototype.hasOwnProperty.call(body, 'minihome_guestbook_enabled')) {
    patch.minihome_guestbook_enabled = Boolean(body.minihome_guestbook_enabled);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'owner_email')) {
    try {
      patch.owner_profile_id = await resolveOwnerField();
    } catch (e) {
      if (e instanceof Error && e.message === 'OWNER_EMAIL_NOT_FOUND') {
        return NextResponse.json({ error: '해당 이메일의 가입 사용자가 없습니다.' }, { status: 400 });
      }
      throw e;
    }
  }

  if (typeof body.slug === 'string' && body.slug.trim()) {
    const newSlug = body.slug.trim().toLowerCase();
    const { data: clash } = await admin.from('local_spots').select('id').eq('slug', newSlug).neq('id', id).maybeSingle();
    if (clash) {
      return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 400 });
    }
    patch.slug = newSlug;
  }

  if (minihome_public_slug) {
    try {
      await assertMinihomeSlugFree(admin, minihome_public_slug, id);
    } catch (e) {
      if (e instanceof Error && e.message === 'MINIHOME_SLUG_TAKEN') {
        return NextResponse.json({ error: '이미 사용 중인 미니홈 공개 슬러그입니다.' }, { status: 400 });
      }
      throw e;
    }
  }

  const { error } = await admin.from('local_spots').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/admin/local-spots');
  revalidatePath('/local');
  revalidatePath('/shop', 'layout');
  return NextResponse.json({ ok: true });
}
