'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE_MAX_AGE_SEC,
  ADMIN_COOKIE_NAME,
  createAdminCookieValue,
  getAdminSecret,
} from '@/lib/adminAuth';

export async function loginAction(formData: FormData): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) {
    redirect('/admin/login?error=config');
  }
  const input = String(formData.get('secret') ?? '').trim();
  if (input !== secret) {
    redirect('/admin/login?error=auth');
  }
  const jar = await cookies();
  const value = createAdminCookieValue(secret);
  jar.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE_SEC,
  });
  redirect('/admin');
}
