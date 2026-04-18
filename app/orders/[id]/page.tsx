import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  }

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, status, payment_method, payment_provider, total_amount_thb, currency, contact_phone, delivery_address, notes, created_at, requested_delivery_at',
    )
    .eq('id', id)
    .single();

  if (!order) {
    notFound();
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('id, item_name, quantity, unit_price_thb, line_total_thb')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const { data: events } = await supabase
    .from('order_status_events')
    .select('id, status, note, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="page-body" style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ marginTop: 0 }}>주문 상세</h1>
        <p style={{ margin: '0 0 8px' }}>주문번호: {order.id}</p>
        <p style={{ margin: '0 0 8px' }}>상태: {order.status}</p>
        <p style={{ margin: '0 0 8px' }}>
          결제: {order.payment_method}
          {order.payment_provider ? ` (${order.payment_provider})` : ''}
        </p>
        <p style={{ margin: '0 0 8px' }}>
          합계: {order.total_amount_thb} {order.currency}
        </p>
        <p style={{ margin: 0 }}>요청 배송 시각: {order.requested_delivery_at ?? '미지정'}</p>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>상품</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(items ?? []).map((item) => (
            <li key={item.id}>
              {item.item_name} · {item.quantity}개 · {item.line_total_thb} THB
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>상태 이력</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(events ?? []).map((event) => (
            <li key={event.id}>
              {event.created_at} · {event.status}
              {event.note ? ` · ${event.note}` : ''}
            </li>
          ))}
        </ul>
      </div>

      <Link href="/local" style={{ color: 'var(--tj-link)' }}>
        ← 로컬로 돌아가기
      </Link>
    </div>
  );
}
