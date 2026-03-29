import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slot = searchParams.get('slot')?.trim() || 'top_bar';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    return NextResponse.json({ banners: [] });
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb
    .from('premium_banners')
    .select('id,slot,title,subtitle,image_url,href,badge_text,sort_order,extra')
    .eq('slot', slot)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, banners: [] }, { status: 200 });
  }

  return NextResponse.json({ banners: data ?? [] });
}
