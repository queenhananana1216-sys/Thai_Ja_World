'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';

type Initial = Record<string, string>;

export function HomeHeroCopyForm({
  initial,
  defaultsHint,
}: {
  initial: Initial;
  defaultsHint: MergedHeroSiteCopy;
}) {
  const router = useRouter();
  const [brandTai, setBrandTai] = useState(initial['home_hero_brand_tai:ko'] ?? '');
  const [brandMid, setBrandMid] = useState(initial['home_hero_brand_mid:ko'] ?? '');
  const [brandSuffix, setBrandSuffix] = useState(initial['home_hero_brand_suffix:ko'] ?? '');
  const [titleKo, setTitleKo] = useState(initial['home_hero_title:ko'] ?? '');
  const [titleTh, setTitleTh] = useState(initial['home_hero_title:th'] ?? '');
  const [tagKo, setTagKo] = useState(initial['home_hero_tag:ko'] ?? '');
  const [tagTh, setTagTh] = useState(initial['home_hero_tag:th'] ?? '');
  const [kickerKo, setKickerKo] = useState(initial['home_hero_kicker:ko'] ?? '');
  const [kickerTh, setKickerTh] = useState(initial['home_hero_kicker:th'] ?? '');
  const [leadKo, setLeadKo] = useState(initial['home_hero_lead:ko'] ?? '');
  const [leadTh, setLeadTh] = useState(initial['home_hero_lead:th'] ?? '');
  const [subKo, setSubKo] = useState(initial['home_hero_sub:ko'] ?? '');
  const [subTh, setSubTh] = useState(initial['home_hero_sub:th'] ?? '');
  const [gPubLabKo, setGPubLabKo] = useState(initial['home_guest_public_label:ko'] ?? '');
  const [gPubLabTh, setGPubLabTh] = useState(initial['home_guest_public_label:th'] ?? '');
  const [gPubBodyKo, setGPubBodyKo] = useState(initial['home_guest_public_body:ko'] ?? '');
  const [gPubBodyTh, setGPubBodyTh] = useState(initial['home_guest_public_body:th'] ?? '');
  const [gMemLabKo, setGMemLabKo] = useState(initial['home_guest_member_label:ko'] ?? '');
  const [gMemLabTh, setGMemLabTh] = useState(initial['home_guest_member_label:th'] ?? '');
  const [gMemBodyKo, setGMemBodyKo] = useState(initial['home_guest_member_body:ko'] ?? '');
  const [gMemBodyTh, setGMemBodyTh] = useState(initial['home_guest_member_body:th'] ?? '');
  const [gCtaKo, setGCtaKo] = useState(initial['home_guest_login_cta:ko'] ?? '');
  const [gCtaTh, setGCtaTh] = useState(initial['home_guest_login_cta:th'] ?? '');
  const [hotLabKo, setHotLabKo] = useState(initial['home_hot_label:ko'] ?? '');
  const [hotLabTh, setHotLabTh] = useState(initial['home_hot_label:th'] ?? '');
  const [hotFootKo, setHotFootKo] = useState(initial['home_hot_footnote:ko'] ?? '');
  const [hotFootTh, setHotFootTh] = useState(initial['home_hot_footnote:th'] ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/site-copy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            { key: 'home_hero_brand_tai', locale: 'ko', value: brandTai },
            { key: 'home_hero_brand_mid', locale: 'ko', value: brandMid },
            { key: 'home_hero_brand_suffix', locale: 'ko', value: brandSuffix },
            { key: 'home_hero_title', locale: 'ko', value: titleKo },
            { key: 'home_hero_title', locale: 'th', value: titleTh },
            { key: 'home_hero_tag', locale: 'ko', value: tagKo },
            { key: 'home_hero_tag', locale: 'th', value: tagTh },
            { key: 'home_hero_kicker', locale: 'ko', value: kickerKo },
            { key: 'home_hero_kicker', locale: 'th', value: kickerTh },
            { key: 'home_hero_lead', locale: 'ko', value: leadKo },
            { key: 'home_hero_lead', locale: 'th', value: leadTh },
            { key: 'home_hero_sub', locale: 'ko', value: subKo },
            { key: 'home_hero_sub', locale: 'th', value: subTh },
            { key: 'home_guest_public_label', locale: 'ko', value: gPubLabKo },
            { key: 'home_guest_public_label', locale: 'th', value: gPubLabTh },
            { key: 'home_guest_public_body', locale: 'ko', value: gPubBodyKo },
            { key: 'home_guest_public_body', locale: 'th', value: gPubBodyTh },
            { key: 'home_guest_member_label', locale: 'ko', value: gMemLabKo },
            { key: 'home_guest_member_label', locale: 'th', value: gMemLabTh },
            { key: 'home_guest_member_body', locale: 'ko', value: gMemBodyKo },
            { key: 'home_guest_member_body', locale: 'th', value: gMemBodyTh },
            { key: 'home_guest_login_cta', locale: 'ko', value: gCtaKo },
            { key: 'home_guest_login_cta', locale: 'th', value: gCtaTh },
            { key: 'home_hot_label', locale: 'ko', value: hotLabKo },
            { key: 'home_hot_label', locale: 'th', value: hotLabTh },
            { key: 'home_hot_footnote', locale: 'ko', value: hotFootKo },
            { key: 'home_hot_footnote', locale: 'th', value: hotFootTh },
          ],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? '저장에 실패했습니다.');
        return;
      }
      setMsg('저장했습니다. 레이아웃 캐시를 갱신했어요 — 홈(/)을 새로고침하면 히어로·안내 문구가 바뀐 걸 볼 수 있어요.');
      router.refresh();
    } catch {
      setErr('네트워크 오류입니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-home-hero-form" onSubmit={onSubmit}>
      {err ? <div className="admin-dash__alert">{err}</div> : null}
      {msg ? <div className="admin-dash__alert admin-dash__alert--ok">{msg}</div> : null}

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>히어로 — 맨 위 작은 태그 줄</legend>
        <label>
          한국어 UI
          <input value={tagKo} onChange={(e) => setTagKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ไทย UI
          <input value={tagTh} onChange={(e) => setTagTh(e.target.value)} maxLength={200} />
        </label>
        <p className="admin-home-hero-form__hint">
          기본 한국어: «{defaultsHint.tagKo}» · 태국어: «{defaultsHint.tagTh}»
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>히어로 — 로고 한 줄 (브랜드 · 세 부분)</legend>
        <div className="admin-home-hero-form__row">
          <label>
            앞 강조
            <input value={brandTai} onChange={(e) => setBrandTai(e.target.value)} maxLength={160} />
          </label>
          <label>
            가운데
            <input value={brandMid} onChange={(e) => setBrandMid(e.target.value)} maxLength={160} />
          </label>
          <label>
            끝 강조
            <input value={brandSuffix} onChange={(e) => setBrandSuffix(e.target.value)} maxLength={160} />
          </label>
        </div>
        <p className="admin-home-hero-form__hint">
          기본: «{defaultsHint.brandTai}»+«{defaultsHint.brandMid}»+«{defaultsHint.brandSuffix}»
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>히어로 — 큰 제목 (h1)</legend>
        <label>
          한국어 UI
          <input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ไทย UI
          <input value={titleTh} onChange={(e) => setTitleTh(e.target.value)} maxLength={200} />
        </label>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>히어로 — 키워드 줄 · 강조 한 줄 · 본문</legend>
        <label>
          키워드 한국어
          <input value={kickerKo} onChange={(e) => setKickerKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          키워드 ไทย
          <input value={kickerTh} onChange={(e) => setKickerTh(e.target.value)} maxLength={200} />
        </label>
        <label>
          강조 한 줄 한국어
          <input value={leadKo} onChange={(e) => setLeadKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          강조 한 줄 ไทย
          <input value={leadTh} onChange={(e) => setLeadTh(e.target.value)} maxLength={200} />
        </label>
        <label>
          본문 한국어 (줄바꿈 가능)
          <textarea
            value={subKo}
            onChange={(e) => setSubKo(e.target.value)}
            maxLength={3000}
            rows={4}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          본문 ไทย
          <textarea
            value={subTh}
            onChange={(e) => setSubTh(e.target.value)}
            maxLength={3000}
            rows={4}
            className="admin-home-hero-form__textarea"
          />
        </label>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>메인 — 비회원 안내 카드 (읽기 / 회원 칸)</legend>
        <p className="admin-home-hero-form__hint" style={{ marginTop: 0 }}>
          비회원에게만 보이는 두 칸 + 버튼 문구입니다.
        </p>
        <label>
          읽기 칸 제목 · 한국어
          <input value={gPubLabKo} onChange={(e) => setGPubLabKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          읽기 칸 제목 · ไทย
          <input value={gPubLabTh} onChange={(e) => setGPubLabTh(e.target.value)} maxLength={200} />
        </label>
        <label>
          읽기 칸 설명 · 한국어
          <textarea
            value={gPubBodyKo}
            onChange={(e) => setGPubBodyKo(e.target.value)}
            maxLength={1200}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          읽기 칸 설명 · ไทย
          <textarea
            value={gPubBodyTh}
            onChange={(e) => setGPubBodyTh(e.target.value)}
            maxLength={1200}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          회원 칸 제목 · 한국어
          <input value={gMemLabKo} onChange={(e) => setGMemLabKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          회원 칸 제목 · ไทย
          <input value={gMemLabTh} onChange={(e) => setGMemLabTh(e.target.value)} maxLength={200} />
        </label>
        <label>
          회원 칸 설명 · 한국어
          <textarea
            value={gMemBodyKo}
            onChange={(e) => setGMemBodyKo(e.target.value)}
            maxLength={1200}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          회원 칸 설명 · ไทย
          <textarea
            value={gMemBodyTh}
            onChange={(e) => setGMemBodyTh(e.target.value)}
            maxLength={1200}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          로그인·가입 버튼 · 한국어
          <input value={gCtaKo} onChange={(e) => setGCtaKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ปุ่มเข้าสู่ระบบ/สมัคร · ไทย
          <input value={gCtaTh} onChange={(e) => setGCtaTh(e.target.value)} maxLength={200} />
        </label>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>메인 — 한 줄 제보(핫 스트립) 제목 · 각주</legend>
        <label>
          제목 한국어
          <input value={hotLabKo} onChange={(e) => setHotLabKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          หัวข้อ ไทย
          <input value={hotLabTh} onChange={(e) => setHotLabTh(e.target.value)} maxLength={200} />
        </label>
        <label>
          각주 한국어
          <textarea
            value={hotFootKo}
            onChange={(e) => setHotFootKo(e.target.value)}
            maxLength={2000}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          หมายเหตุท้าย ไทย
          <textarea
            value={hotFootTh}
            onChange={(e) => setHotFootTh(e.target.value)}
            maxLength={2000}
            rows={3}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <p className="admin-home-hero-form__hint">
          기본 한국어 제목: «{defaultsHint.hotLabelKo}»
        </p>
      </fieldset>

      <div className="admin-home-hero-form__actions">
        <button type="submit" className="admin-home-hero-form__submit" disabled={busy}>
          {busy ? '저장 중…' : '전체 저장'}
        </button>
      </div>
    </form>
  );
}
