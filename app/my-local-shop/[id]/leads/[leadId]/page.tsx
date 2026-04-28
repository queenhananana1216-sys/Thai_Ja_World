import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

type LeadDetailRow = {
  id: string;
  spot_id: string;
  customer_name: string | null;
  phone: string;
  status: string;
  requested_time: string | null;
  requested_note: string | null;
  menu_snapshot: unknown;
  created_at: string;
};

function formatKst(ts: string | null): string {
  if (!ts) return '시간 미지정';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '시간 미지정';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export default async function OwnerShopLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>;
}) {
  const { id, leadId } = await params;
  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) notFound();

  const admin = createServiceRoleClient();
  const { data: spot } = await admin
    .from('local_spots')
    .select('id,name')
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .maybeSingle();
  if (!spot) notFound();

  const { data: lead } = await admin
    .from('shop_order_leads')
    .select('id,spot_id,customer_name,phone,status,requested_time,requested_note,menu_snapshot,created_at')
    .eq('id', leadId)
    .eq('spot_id', id)
    .maybeSingle();
  if (!lead) notFound();

  const row = lead as LeadDetailRow;
  const menuRows = Array.isArray(row.menu_snapshot) ? row.menu_snapshot : [];

  return (
    <section className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.42)] backdrop-blur-md">
        <p className="text-xs font-semibold tracking-wide text-violet-200">예약/주문 상세</p>
        <h2 className="mt-1 truncate text-lg font-semibold">{spot.name}</h2>
        <p className="mt-1 truncate text-sm text-slate-300">
          {row.customer_name?.trim() || '고객'} · {row.phone}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
          <p className="text-xs text-slate-400">상태</p>
          <p className="mt-1 truncate text-sm font-semibold text-violet-200">{row.status}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
          <p className="text-xs text-slate-400">요청 시각</p>
          <p className="mt-1 truncate text-sm">{formatKst(row.requested_time)}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
          <p className="text-xs text-slate-400">접수 시각</p>
          <p className="mt-1 truncate text-sm">{formatKst(row.created_at)}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
        <p className="text-xs text-slate-400">요청 메모</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          {row.requested_note?.trim() || '요청 메모가 없습니다.'}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
        <p className="text-xs text-slate-400">메뉴 스냅샷</p>
        {menuRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300">등록된 메뉴 항목이 없습니다.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {menuRows.slice(0, 12).map((item, idx) => {
              const rowItem = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
              const name = typeof rowItem.name === 'string' ? rowItem.name : `메뉴 ${idx + 1}`;
              const price = typeof rowItem.price === 'string' || typeof rowItem.price === 'number' ? String(rowItem.price) : '-';
              const qty = typeof rowItem.quantity === 'number' ? rowItem.quantity : 1;
              return (
                <article key={`${name}-${idx}`} className="rounded-xl border border-white/10 bg-slate-800/75 p-3">
                  <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
                  <p className="mt-1 truncate text-xs text-slate-300">
                    수량 {qty} · 가격 {price}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
