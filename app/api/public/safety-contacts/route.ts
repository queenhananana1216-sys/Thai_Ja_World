import { NextResponse } from 'next/server';
import { getLocale } from '@/i18n/get-locale';
import { fetchPublicSafetyContacts } from '@/lib/safety/fetchPublicSafetyContacts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const locale = await getLocale().catch(() => 'ko' as const);
  const items = await fetchPublicSafetyContacts(locale, 30);
  return NextResponse.json({ items });
}
