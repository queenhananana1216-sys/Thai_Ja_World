import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import OwnerShopShell, { type OwnerShopSummary } from '../_components/OwnerShopShell';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: '내 가게 관리', robots: { index: false, follow: false } };
  try {
    const sb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { title: '내 가게 관리', robots: { index: false, follow: false } };
    const { data } = await sb
      .from('local_spots')
      .select('name')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    return {
      title: data?.name ? `${data.name} — 내 가게 관리` : '내 가게 관리',
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: '내 가게 관리', robots: { index: false, follow: false } };
  }
}

async function loadOwnedSpot(id: string): Promise<OwnerShopSummary | null> {
  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('local_spots')
    .select('id,name,minihome_public_slug')
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as OwnerShopSummary;
}

export default async function OwnerShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const spot = await loadOwnedSpot(id);
  if (!spot) notFound();

  return <OwnerShopShell spot={spot}>{children}</OwnerShopShell>;
}
