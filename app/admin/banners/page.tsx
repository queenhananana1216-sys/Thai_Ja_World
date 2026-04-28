import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import AdminBannersClient, { type AdminBannerLite } from './_components/AdminBannersClient';

export default async function AdminBannersPage() {
  let rows: AdminBannerLite[] = [];
  let error: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error: qErr } = await admin
      .from('premium_banners')
      .select('id, title, subtitle, placement, route_group, href, sort_order, is_active, extra')
      .order('placement', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
      .limit(200);
    if (qErr) error = qErr.message;
    else {
      rows = (data ?? []).map((row) => {
        const extra =
          row.extra && typeof row.extra === 'object' && !Array.isArray(row.extra)
            ? (row.extra as Record<string, unknown>)
            : {};
        const cta = typeof extra.cta === 'string' ? extra.cta : null;
        return {
          id: String(row.id),
          title: String(row.title ?? ''),
          subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
          cta,
          placement: (row.placement as string | null) ?? null,
          route_group: (row.route_group as string | null) ?? null,
          href: (row.href as string | null) ?? null,
          sort_order: (row.sort_order as number | null) ?? null,
          is_active: (row.is_active as boolean | null) ?? null,
        } satisfies AdminBannerLite;
      });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="admin-page">
      <p className="m-0 mb-2">
        <Link href="/admin" className="text-sm text-violet-300 no-underline hover:underline">
          ← 관리자 개요
        </Link>
      </p>
      <h1 className="admin-dash__title">배너 온/오프</h1>
      <p className="admin-dash__lead">
        오너가 코드 수정 없이 배너 노출을 즉시 제어할 수 있는 최소 운영 페이지입니다. 향후 권한 체계(RBAC),
        필터, 일괄 편집을 붙일 수 있도록 경로를 `admin/banners`로 분리했습니다.
      </p>
      {error ? <p className="admin-dash__alert">{error}</p> : null}
      <AdminBannersClient rows={rows} />
    </main>
  );
}
