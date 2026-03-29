/**
 * 공개 로컬 가게 목록 (published 만, RLS 준수 — anon 클라이언트)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    return NextResponse.json({ error: 'Supabase 공개 설정 없음' }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from('local_spots')
    .select(
      'slug,name,description,line_url,photo_urls,category,tags,sort_order,extra,updated_at,minihome_public_slug',
    )
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ spots: data ?? [] });
}
