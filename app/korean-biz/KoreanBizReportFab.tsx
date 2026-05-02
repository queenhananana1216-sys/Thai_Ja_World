'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { KoreanBizRow } from './KoreanBizHubClient';
import type { Locale } from '@/i18n/types';

type Props = {
  defaultRegion: KoreanBizRow['region'];
  locale: Locale;
};

const COPY = {
  ko: {
    fab: '➕ 우리 동네 한인 업소 제보하기',
    title: '한인 업소 제보',
    lead: '목록에 없는 마트·약국·병원·렌트·골프·스파 업소를 알려 주세요. 검토 후 반영됩니다.',
    name: '업소 이름',
    address: '주소 (선택)',
    phone: '연락처 (선택)',
    region: '지역',
    category: '업종 (선택)',
    note: '추가 메모 (선택)',
    submit: '제보 보내기',
    cancel: '닫기',
    sending: '전송 중…',
    ok: '제보해 주셔서 감사합니다. 검토 후 반영할게요.',
    err: '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    reqName: '이름을 2글자 이상 입력해 주세요.',
  },
  th: {
    fab: '➕ แจ้งร้านเกาหลีในละแวกคุณ',
    title: 'แจ้งร้านเกาหลี',
    lead: 'หากไม่มีในรายการ แจ้งมาร์ท/ร้านยา/โรงพยาบาล/เช่ารถ/กอล์ฟ/สปาได้ที่นี่ — เราจะตรวจแล้วนำเข้า',
    name: 'ชื่อร้าน',
    address: 'ที่อยู่ (ถ้ามี)',
    phone: 'เบอร์โทร (ถ้ามี)',
    region: 'ภูมิภาค',
    category: 'ประเภท (ถ้ามี)',
    note: 'หมายเหตุ (ถ้ามี)',
    submit: 'ส่งข้อมูล',
    cancel: 'ปิด',
    sending: 'กำลังส่ง…',
    ok: 'ขอบคุณค่ะ — จะตรวจและอัปเดตให้',
    err: 'ส่งไม่สำเร็จ — ลองใหม่ภายหลัง',
    reqName: 'กรอกชื่ออย่างน้อย 2 ตัวอักษร',
  },
  en: {
    fab: '➕ Suggest a Korean business',
    title: 'Suggest a listing',
    lead: 'Tell us about a mart, pharmacy, hospital, rental, golf desk, or spa missing from the map. We review before publishing.',
    name: 'Business name',
    address: 'Address (optional)',
    phone: 'Phone (optional)',
    region: 'Area',
    category: 'Category (optional)',
    note: 'Notes (optional)',
    submit: 'Send',
    cancel: 'Close',
    sending: 'Sending…',
    ok: 'Thanks — we will review and update the map.',
    err: 'Could not send. Please try again later.',
    reqName: 'Please enter at least 2 characters for the name.',
  },
  zh: {
    fab: '➕ 提交韩人店铺',
    title: '店铺爆料',
    lead: '若地图上没有某家超市/药房/医院/租车/高尔夫/按摩店，请告诉我们。审核后会补充。',
    name: '店名',
    address: '地址（可选）',
    phone: '电话（可选）',
    region: '地区',
    category: '类型（可选）',
    note: '备注（可选）',
    submit: '提交',
    cancel: '关闭',
    sending: '发送中…',
    ok: '感谢提交，我们会审核后更新。',
    err: '发送失败，请稍后重试。',
    reqName: '名称请至少填写 2 个字符。',
  },
} as const;

const REGIONS: { key: KoreanBizRow['region']; label: Record<Locale, string> }[] = [
  {
    key: 'bangkok',
    label: { ko: '방콕', th: 'กรุงเทพฯ', en: 'Bangkok', zh: '曼谷' },
  },
  {
    key: 'pattaya',
    label: { ko: '파타야', th: 'พัทยา', en: 'Pattaya', zh: '芭提雅' },
  },
  {
    key: 'chiangmai',
    label: { ko: '치앙마이', th: 'เชียงใหม่', en: 'Chiang Mai', zh: '清迈' },
  },
];

const CAT_OPTIONS: { key: KoreanBizRow['category']; label: Record<Locale, string> }[] = [
  {
    key: 'mart',
    label: { ko: '🛒 마트', th: '🛒 มาร์ท', en: '🛒 Mart', zh: '🛒 超市' },
  },
  {
    key: 'pharmacy',
    label: { ko: '💊 약국', th: '💊 ร้านยา', en: '💊 Pharmacy', zh: '💊 药房' },
  },
  {
    key: 'hospital',
    label: {
      ko: '🏥 병원·클리닉',
      th: '🏥 โรงพยาบาล/คลินิก',
      en: '🏥 Hospital / clinic',
      zh: '🏥 医院/诊所',
    },
  },
  {
    key: 'vehicle_rent',
    label: {
      ko: '🛵 오토바이·차량 렌트',
      th: '🛵 เช่ามอเตอร์ไซค์/รถ',
      en: '🛵 Bike / car rental',
      zh: '🛵 摩托/租车',
    },
  },
  {
    key: 'golf',
    label: {
      ko: '⛳ 골프·투어',
      th: '⛳ กอล์ฟ·ทัวร์',
      en: '⛳ Golf / tours',
      zh: '⛳ 高尔夫/行程',
    },
  },
  {
    key: 'massage_spa',
    label: {
      ko: '💆 마사지·스파',
      th: '💆 นวด·สปา',
      en: '💆 Massage / spa',
      zh: '💆 按摩/水疗',
    },
  },
];

export default function KoreanBizReportFab({ defaultRegion, locale }: Props) {
  const t = COPY[locale];
  const unsetLabel =
    locale === 'th' ? 'ไม่ระบุ' : locale === 'en' ? 'Not set' : locale === 'zh' ? '未选择' : '선택 안 함';
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState<KoreanBizRow['region']>(defaultRegion);
  const [category, setCategory] = useState<'' | KoreanBizRow['category']>('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<'idle' | 'ok' | 'err'>('idle');

  const openModal = useCallback(() => {
    setRegion(defaultRegion);
    setMessage('idle');
    setOpen(true);
  }, [defaultRegion]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setPending(false);
  }, []);

  useEffect(() => {
    if (!open) setRegion(defaultRegion);
  }, [defaultRegion, open]);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      window.alert(t.reqName);
      return;
    }
    setPending(true);
    setMessage('idle');
    try {
      const res = await fetch('/api/korean-biz/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          address: address.trim() || null,
          phone: phone.trim() || null,
          suggested_region: region,
          suggested_category: category || null,
          submitter_note: note.trim() || null,
          website: '',
        }),
      });
      if (!res.ok) {
        setMessage('err');
        return;
      }
      setMessage('ok');
      setName('');
      setAddress('');
      setPhone('');
      setNote('');
      setCategory('');
      window.setTimeout(() => {
        closeModal();
        setMessage('idle');
      }, 2200);
    } catch {
      setMessage('err');
    } finally {
      setPending(false);
    }
  }, [address, category, closeModal, name, note, phone, region, t.reqName]);

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-end p-4 md:p-6">
        <button
          type="button"
          onClick={openModal}
          className="pointer-events-auto inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-amber-400/45 bg-gradient-to-r from-amber-600/35 via-amber-500/25 to-yellow-600/25 px-4 py-3 text-sm font-bold text-amber-50 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_28px_rgba(251,191,36,0.22)] backdrop-blur-xl transition hover:border-amber-300/70 hover:from-amber-500/45 md:text-base"
        >
          <span aria-hidden>➕</span>
          <span className="text-left leading-tight">{t.fab}</span>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-black/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-title`}
          >
            <h2 id={`${baseId}-title`} className="text-lg font-black text-white md:text-xl">
              {t.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{t.lead}</p>

            <div className="mt-5 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.name}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="organization"
                  className="min-h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-white outline-none ring-amber-400/0 transition focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.region}
                </span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as KoreanBizRow['region'])}
                  className="min-h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-white outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                >
                  {REGIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.category}
                </span>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory((e.target.value || '') as '' | KoreanBizRow['category'])
                  }
                  className="min-h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-white outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                >
                  <option value="">{unsetLabel}</option>
                  {CAT_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.address}
                </span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.phone}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="min-h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-white outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                />
              </label>
              <label className="sr-only" htmlFor={`${baseId}-hp`}>
                Leave blank
              </label>
              <input id={`${baseId}-hp`} type="text" tabIndex={-1} autoComplete="off" className="hidden" />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t.note}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
                />
              </label>
            </div>

            {message === 'ok' ? (
              <p className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
                {t.ok}
              </p>
            ) : null}
            {message === 'err' ? (
              <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
                {t.err}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void submit()}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-lg hover:bg-amber-400 disabled:opacity-60 sm:flex-none"
              >
                {pending ? t.sending : t.submit}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 sm:flex-none"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
