import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

type LeadRow = {
  id: string;
  customer_name: string | null;
  phone: string;
  status: string;
  requested_time: string | null;
  created_at: string;
};

function formatKst(ts: string | null): string {
  if (!ts) return '시간 미지정';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '시간 미지정';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export default async function OwnerShopLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: leads } = await admin
    .from('shop_order_leads')
    .select('id,customer_name,phone,status,requested_time,created_at')
    .eq('spot_id', id)
    .order('created_at', { ascending: false })
    .limit(80);

  const rows = (leads ?? []) as LeadRow[];

  return (
    <section className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.42)] backdrop-blur-md">
        <p className="text-xs font-semibold tracking-wide text-violet-200">shop_order_leads</p>
        <h2 className="mt-1 truncate text-lg font-semibold">{spot.name} 예약/주문 리드</h2>
        <p className="mt-1 text-sm text-slate-300">최신 80건 기준, 상세를 클릭하면 메뉴 스냅샷과 메모를 확인할 수 있습니다.</p>
      </header>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md">
          <p className="text-sm text-slate-300">아직 접수된 예약/주문 리드가 없습니다.</p>
        </section>
      ) : (
        <div className="grid gap-2">
          {rows.map((lead) => (
            <Link
              key={lead.id}
              href={`/my-local-shop/${id}/leads/${lead.id}`}
              className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/55 p-3 text-sm no-underline transition hover:border-violet-300/40 hover:bg-slate-800/70 md:grid-cols-3"
            >
              <p className="truncate font-semibold text-slate-100">
                {lead.customer_name?.trim() || '고객'} · {lead.phone}
              </p>
              <p className="truncate text-slate-300">{formatKst(lead.requested_time)}</p>
              <p className="truncate text-violet-200">{lead.status}</p>
              <p className="truncate text-xs text-slate-500 md:col-span-3">접수: {formatKst(lead.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
