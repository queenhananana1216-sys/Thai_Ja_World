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
          ],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? '저장에 실패했습니다.');
        return;
      }
      setMsg('저장했습니다. 홈에 반영하려면 페이지를 새로고침하세요.');
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
        <legend>맨 위 작은 태그 줄</legend>
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
        <legend>로고 한 줄 (브랜드 · 세 부분 이어 붙임)</legend>
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
          코드 기본: «{defaultsHint.brandTai}» + «{defaultsHint.brandMid}» + «{defaultsHint.brandSuffix}» → 합치면
          &quot;태국에 살자&quot; 스타일
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>홈 큰 제목 (h1)</legend>
        <label>
          한국어 UI
          <input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ไทย UI
          <input value={titleTh} onChange={(e) => setTitleTh(e.target.value)} maxLength={200} />
        </label>
        <p className="admin-home-hero-form__hint">
          기본 한국어: «{defaultsHint.titleKo}» · 태국어: «{defaultsHint.titleTh}»
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>h1 아래 키워드 줄 (경험담 · 제보 …)</legend>
        <label>
          한국어 UI
          <input value={kickerKo} onChange={(e) => setKickerKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ไทย UI
          <input value={kickerTh} onChange={(e) => setKickerTh(e.target.value)} maxLength={200} />
        </label>
        <p className="admin-home-hero-form__hint">
          기본 한국어: «{defaultsHint.heroKickerKo}»
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>강조 한 줄 (막히면 여기서부터)</legend>
        <label>
          한국어 UI
          <input value={leadKo} onChange={(e) => setLeadKo(e.target.value)} maxLength={200} />
        </label>
        <label>
          ไทย UI
          <input value={leadTh} onChange={(e) => setLeadTh(e.target.value)} maxLength={200} />
        </label>
        <p className="admin-home-hero-form__hint">
          기본 한국어: «{defaultsHint.heroLeadKo}»
        </p>
      </fieldset>

      <fieldset className="admin-home-hero-form__fieldset">
        <legend>본문 (줄바꿈은 Enter — 홈에서 그대로 줄이 갈립니다)</legend>
        <label>
          한국어 UI
          <textarea
            value={subKo}
            onChange={(e) => setSubKo(e.target.value)}
            maxLength={3000}
            rows={5}
            className="admin-home-hero-form__textarea"
          />
        </label>
        <label>
          ไทย UI
          <textarea
            value={subTh}
            onChange={(e) => setSubTh(e.target.value)}
            maxLength={3000}
            rows={5}
            className="admin-home-hero-form__textarea"
          />
        </label>
      </fieldset>

      <div className="admin-home-hero-form__actions">
        <button type="submit" className="admin-home-hero-form__submit" disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  );
}
