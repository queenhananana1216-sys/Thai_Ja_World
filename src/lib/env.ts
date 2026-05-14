import 'server-only';

/** Runtime: read process.env only. Master F: paths are next.config build-time only. */

export function isCloudServerEnv(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getPublicSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

export function getPublicSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

export function getSupabaseServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}

export function getPublicSiteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/+$/u, '');
  const vercel = (process.env.VERCEL_URL ?? '').trim();
  if (vercel) {
    const v = vercel.replace(/\/+$/u, '');
    return `https://${v}`;
  }
  return '';
}
