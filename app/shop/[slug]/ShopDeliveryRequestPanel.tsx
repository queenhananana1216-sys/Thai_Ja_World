'use client';

import { useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';

type Props = {
  spotId: string;
  deliveryEnabled: boolean;
  leadMinutes: number;
  notice: string;
  contact: string;
  quickEnabled: boolean;
};

function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes() - (d.getMinutes() % 5));
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function ShopDeliveryRequestPanel({
  spotId,
  deliveryEnabled,
  leadMinutes,
  notice,
  contact,
  quickEnabled,
}: Props) {
  const { locale } = useClientLocaleDictionary();
  const T = useMemo(
    () =>
      locale === 'th'
        ? {
            title: 'จองจัดส่งด่วน',
            lead: 'ส่งคำขอล่วงหน้า แล้วร้านจะยืนยันเวลาอีกครั้ง',
            customer: 'ชื่อผู้สั่ง',
            phone: 'เบอร์ติดต่อ',
            address: 'ที่อยู่จัดส่ง',
            order: 'รายการ/หมายเหตุ',
            desiredAt: 'เวลาที่ต้องการรับ',
            submit: 'ส่งคำขอจัดส่ง',
            sending: 'กำลังส่ง...',
            success: 'ส่งคำขอแล้ว ร้านจะติดต่อกลับเพื่อยืนยัน',
            failed: 'ส่งคำขอไม่สำเร็จ โปรดลองอีกครั้ง',
            quickHint: 'ใช้ผู้ให้บริการส่งด่วน',
            minTime: 'เวลาจองต้องมากกว่าเวลาปัจจุบัน',
          }
        : {
            title: '예약 퀵배달 신청',
            lead: '원하는 시간으로 예약 요청을 보내면, 가게가 확정 연락을 드립니다.',
            customer: '주문자 이름',
            phone: '연락처',
            address: '배달 주소',
            order: '주문 내용/요청사항',
            desiredAt: '희망 배달 시각',
            submit: '배달 예약 요청 보내기',
            sending: '전송 중…',
            success: '접수되었습니다. 가게에서 확정 연락을 드립니다.',
            failed: '요청 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
            quickHint: '퀵 기사 연동 배달 가능',
            minTime: '현재 시각보다 이후 시간으로 선택해 주세요.',
          },
    [locale],
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [order, setOrder] = useState('');
  const [desiredAt, setDesiredAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + leadMinutes * 60_000)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!deliveryEnabled) return null;

  async function submit() {
    const desiredDate = new Date(desiredAt);
    if (!Number.isFinite(desiredDate.getTime()) || desiredDate.getTime() <= Date.now()) {
      setMsg(T.minTime);
      return;
    }
    if (name.trim().length < 2 || phone.trim().length < 6 || address.trim().length < 5 || order.trim().length < 2) {
      setMsg(T.failed);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/shop/delivery-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spotId,
          requesterName: name.trim(),
          requesterPhone: phone.trim(),
          deliveryAddress: address.trim(),
          orderSummary: order.trim(),
          desiredAt: desiredDate.toISOString(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || T.failed);
      setMsg(T.success);
      setOrder('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : T.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{T.title}</h2>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#cbd5e1' }}>
        {T.lead} ({Math.max(10, leadMinutes)}m+)
        {quickEnabled ? ` · ${T.quickHint}` : ''}
      </p>
      {notice ? <p style={{ margin: '8px 0 0', fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{notice}</p> : null}
      {contact ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#cbd5e1' }}>
          {locale === 'th' ? 'ติดต่อร้าน:' : '가게 연락:'} {contact}
        </p>
      ) : null}
      {msg ? <p style={{ margin: '8px 0 0', fontSize: 13, color: msg === T.success ? '#86efac' : '#fca5a5' }}>{msg}</p> : null}

      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={T.customer}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.55)', color: '#f8fafc' }}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={T.phone}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.55)', color: '#f8fafc' }}
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={T.address}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.55)', color: '#f8fafc' }}
        />
        <textarea
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          rows={3}
          placeholder={T.order}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.55)', color: '#f8fafc' }}
        />
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#e2e8f0' }}>{T.desiredAt}</span>
          <input
            type="datetime-local"
            value={desiredAt}
            onChange={(e) => setDesiredAt(e.target.value)}
            style={{ width: 260, maxWidth: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.55)', color: '#f8fafc' }}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        style={{
          marginTop: 10,
          padding: '10px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#7c3aed',
          color: '#fff',
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? T.sending : T.submit}
      </button>
    </section>
  );
}
