'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';

type DeliveryRequestRow = {
  id: string;
  requester_name: string;
  requester_phone: string;
  delivery_address: string;
  order_summary: string;
  desired_at: string;
  status: 'requested' | 'confirmed' | 'dispatching' | 'completed' | 'cancelled';
  owner_memo: string | null;
  created_at: string;
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as Record<string, unknown>) };
  return {};
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(10, Math.min(480, Math.floor(v)));
}

export default function OwnerShopDeliveryClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { locale } = useClientLocaleDictionary();

  const T = useMemo(
    () =>
      locale === 'th'
        ? {
            loading: 'กำลังโหลด...',
            sessionExpired: 'เซสชันหมดอายุ โปรดเข้าสู่ระบบใหม่',
            saveOk: 'บันทึกแล้ว',
            sectionLead: 'ตั้งค่าการจัดส่งแบบจองล่วงหน้าและจัดการคำขอจากลูกค้า',
            enabled: 'เปิดใช้งานการจองส่งด่วน',
            quickEnabled: 'ใช้ผู้ให้บริการด่วนภายนอก',
            leadMinutes: 'เวลาจองล่วงหน้า (นาที)',
            contact: 'ช่องทางติดต่อผู้ดูแลร้าน (LINE/โทร)',
            notice: 'คำแนะนำสำหรับลูกค้า',
            save: 'บันทึกการตั้งค่า',
            saving: 'กำลังบันทึก...',
            requests: 'รายการคำขอล่าสุด',
            empty: 'ยังไม่มีคำขอจองจัดส่ง',
            status: 'สถานะ',
            customer: 'ลูกค้า',
            address: 'ที่อยู่',
            order: 'รายการ',
            requestedAt: 'เวลาที่ลูกค้าต้องการ',
            createdAt: 'เวลาที่ส่งคำขอ',
            memo: 'โน้ตของร้าน',
            saveRow: 'อัปเดตสถานะ',
            saveRowBusy: 'กำลังอัปเดต...',
          }
        : {
            loading: '불러오는 중…',
            sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
            saveOk: '저장했습니다.',
            sectionLead: '예약제 퀵배달 설정을 저장하고, 고객 요청 상태를 관리할 수 있습니다.',
            enabled: '예약 배달 받기 활성화',
            quickEnabled: '퀵 기사/외부 배달 연동 사용',
            leadMinutes: '최소 예약 리드타임 (분)',
            contact: '가게 연락 안내 (LINE/전화)',
            notice: '고객 안내 문구',
            save: '배달 설정 저장',
            saving: '저장 중…',
            requests: '최근 배달 예약 요청',
            empty: '아직 접수된 배달 예약이 없습니다.',
            status: '상태',
            customer: '고객',
            address: '배달 주소',
            order: '주문 내용',
            requestedAt: '희망 배달 시각',
            createdAt: '접수 시각',
            memo: '가게 메모',
            saveRow: '상태 저장',
            saveRowBusy: '저장 중…',
          },
    [locale],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [extraObj, setExtraObj] = useState<Record<string, unknown>>({});
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [quickEnabled, setQuickEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(45);
  const [contactText, setContactText] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [rows, setRows] = useState<DeliveryRequestRow[]>([]);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [spotRes, reqRes] = await Promise.all([
      sb
        .from('local_spots')
        .select('minihome_extra')
        .eq('id', id)
        .eq('owner_profile_id', user.id)
        .maybeSingle(),
      sb
        .from('local_shop_delivery_requests')
        .select(
          'id,requester_name,requester_phone,delivery_address,order_summary,desired_at,status,owner_memo,created_at',
        )
        .eq('local_spot_id', id)
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

    if (spotRes.error) {
      setMsg(spotRes.error.message);
      setLoading(false);
      return;
    }
    const ex = asRecord(spotRes.data?.minihome_extra);
    setExtraObj(ex);
    setDeliveryEnabled(asBool(ex.delivery_enabled, false));
    setQuickEnabled(asBool(ex.delivery_quick_enabled, true));
    setLeadMinutes(asNumber(ex.delivery_lead_minutes, 45));
    setContactText(asString(ex.delivery_contact));
    setNoticeText(asString(ex.delivery_notice));

    if (reqRes.error) {
      setMsg(reqRes.error.message);
      setRows([]);
    } else {
      setRows((reqRes.data as DeliveryRequestRow[] | null) ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    if (!id) return;
    setSaving(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg(T.sessionExpired);
      setSaving(false);
      return;
    }
    const next = { ...extraObj };
    next.delivery_enabled = deliveryEnabled;
    next.delivery_quick_enabled = quickEnabled;
    next.delivery_lead_minutes = Math.max(10, Math.min(480, Math.floor(leadMinutes || 45)));
    if (contactText.trim()) next.delivery_contact = contactText.trim();
    else delete next.delivery_contact;
    if (noticeText.trim()) next.delivery_notice = noticeText.trim();
    else delete next.delivery_notice;

    const { error } = await sb
      .from('local_spots')
      .update({ minihome_extra: next })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }
    setExtraObj(next);
    setMsg(T.saveOk);
    setSaving(false);
  }

  async function updateRow(row: DeliveryRequestRow, nextStatus: DeliveryRequestRow['status'], memo: string) {
    setRowBusy(row.id);
    setMsg(null);
    const sb = createBrowserClient();
    const { error } = await sb
      .from('local_shop_delivery_requests')
      .update({ status: nextStatus, owner_memo: memo.trim() || null })
      .eq('id', row.id)
      .eq('local_spot_id', id);
    if (error) setMsg(error.message);
    await load();
    setRowBusy(null);
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>{T.loading}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{T.sectionLead}</p>
      {msg ? <p style={{ margin: 0, fontSize: 14, color: msg === T.saveOk ? '#059669' : '#dc2626' }}>{msg}</p> : null}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} />
        <span style={{ fontSize: 14 }}>{T.enabled}</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={quickEnabled} onChange={(e) => setQuickEnabled(e.target.checked)} />
        <span style={{ fontSize: 14 }}>{T.quickEnabled}</span>
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{T.leadMinutes}</span>
        <input
          type="number"
          min={10}
          max={480}
          step={5}
          value={leadMinutes}
          onChange={(e) => setLeadMinutes(Number(e.target.value))}
          style={{ width: 180, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{T.contact}</span>
        <input
          value={contactText}
          onChange={(e) => setContactText(e.target.value)}
          placeholder={locale === 'th' ? 'เช่น LINE: @myshop' : '예: LINE @myshop / 02-123-4567'}
          style={{ width: '100%', maxWidth: 420, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{T.notice}</span>
        <textarea
          rows={3}
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
          style={{ width: '100%', maxWidth: 680, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={() => void saveSettings()}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 16px',
          border: 'none',
          borderRadius: 8,
          background: '#7c3aed',
          color: '#fff',
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? T.saving : T.save}
      </button>

      <section style={{ marginTop: 14 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>{T.requests}</h2>
        {rows.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{T.empty}</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {rows.map((row) => {
            const statusValue = row.status;
            const memoValue = row.owner_memo ?? '';
            return (
              <li
                key={row.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  background: '#fff',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong>{T.customer}:</strong> {row.requester_name} / {row.requester_phone}
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong>{T.address}:</strong> {row.delivery_address}
                </p>
                <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  <strong>{T.order}:</strong> {row.order_summary}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                  <strong>{T.requestedAt}:</strong> {formatDate(row.desired_at)}
                  {'  ·  '}
                  <strong>{T.createdAt}:</strong> {formatDate(row.created_at)}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{T.status}</span>
                    <select
                      defaultValue={statusValue}
                      onChange={(e) => {
                        const selectEl = e.currentTarget;
                        const wrapper = selectEl.closest('li');
                        const memoEl = wrapper?.querySelector(
                          `textarea[data-memo="${row.id}"]`,
                        ) as HTMLTextAreaElement | null;
                        const nextMemo = memoEl?.value ?? memoValue;
                        void updateRow(row, selectEl.value as DeliveryRequestRow['status'], nextMemo);
                      }}
                      disabled={rowBusy === row.id}
                      style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    >
                      <option value="requested">requested</option>
                      <option value="confirmed">confirmed</option>
                      <option value="dispatching">dispatching</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </label>
                </div>
                <textarea
                  data-memo={row.id}
                  defaultValue={memoValue}
                  rows={2}
                  placeholder={T.memo}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
                <button
                  type="button"
                  disabled={rowBusy === row.id}
                  onClick={(e) => {
                    const li = e.currentTarget.closest('li');
                    const statusEl = li?.querySelector('select') as HTMLSelectElement | null;
                    const memoEl = li?.querySelector(`textarea[data-memo="${row.id}"]`) as HTMLTextAreaElement | null;
                    void updateRow(
                      row,
                      (statusEl?.value as DeliveryRequestRow['status']) ?? row.status,
                      memoEl?.value ?? memoValue,
                    );
                  }}
                  style={{
                    justifySelf: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: rowBusy === row.id ? 'wait' : 'pointer',
                  }}
                >
                  {rowBusy === row.id ? T.saveRowBusy : T.saveRow}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
