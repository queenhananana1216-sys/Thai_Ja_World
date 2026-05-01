/**
 * 404 자가 치유 레이더 — 경로에서 UUID 를 찾아 뉴스·게시글 실체 URL 제안
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function orderedCandidateIds(path: string): string[] {
  const decoded = decodeURIComponent(path.trim());
  const segments = decoded.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const set = new Set<string>();
  if (last && UUID_RE.test(last)) {
    set.add(last.toLowerCase());
  }
  const re = new RegExp(UUID_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded)) !== null) {
    set.add(m[0].toLowerCase());
  }
  return [...set];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') ?? '';
  const ids = orderedCandidateIds(path);
  if (ids.length === 0) {
    return NextResponse.json({ status: 'not_found' as const });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ status: 'not_found' as const });
  }

  const sb = createClient(sbUrl, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const id of ids) {
    const { data: pn } = await sb.from('processed_news').select('id, published').eq('id', id).maybeSingle();
    if (pn) {
      if (pn.published) {
        return NextResponse.json({ status: 'redirect' as const, to: `/news/${id}` });
      }
      return NextResponse.json({
        status: 'processing' as const,
        message: 'AI가 기사를 한국어로 가공하고 있습니다. 잠시만 기다려주세요.',
      });
    }
  }

  for (const id of ids) {
    const { data: bp } = await sb.from('board_posts').select('id').eq('id', id).maybeSingle();
    if (bp) {
      return NextResponse.json({ status: 'redirect' as const, to: `/boards/${id}` });
    }
  }

  for (const id of ids) {
    const { data: po } = await sb
      .from('posts')
      .select('id')
      .eq('id', id)
      .eq('moderation_status', 'safe')
      .maybeSingle();
    if (po) {
      return NextResponse.json({ status: 'redirect' as const, to: `/community/boards/${id}` });
    }
  }

  return NextResponse.json({ status: 'not_found' as const });
}
