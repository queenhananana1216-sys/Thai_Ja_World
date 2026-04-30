import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Emergency total bypass: no Supabase, no getUser(), no env checks, no redirects.
 * All traffic passes through until this file is safely restored.
 */
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)',
  ],
};
