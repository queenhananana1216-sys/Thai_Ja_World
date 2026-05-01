'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TextScale } from '@/lib/site-settings/siteUiSettings';

type Row = { key: string; value: unknown; updated_at?: string };

export default function SiteDesignControlClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [textScale, setTextScale] = useState<TextScale>('normal');
  const [hideAi, setHideAi] = useState(false);
  const [weather, setWeather] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/site-settings', { cache: 'no-store' });
      if (!res.ok) {
        setErr(res.status === 403 ? '권한이 없습니다. 오너 계정으로 로그인하세요.' : '불러오지 못했습니다.');
        return;
      }
      const body = (await res.json()) as { rows?: Row[] };
      const r = body.rows ?? [];
      setRows(r);
      for (const x of r) {
        if (x.key === 'ui.text_scale') setTextScale((x.value as TextScale) || 'normal');
        if (x.key === 'ui.hide_ai_chrome') setHideAi(Boolean(x.value));
        if (x.key === 'ui.weather_widget_enabled') setWeather(Boolean(x.value));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(partial: { key: string; value: unknown }[]) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: partial }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? '저장 실패');
        return;
      }
      await load();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 오류');
    } finally {
      setSaving(false);
    }
  }

  if (busy) {
    return <p className="admin-design__state">설정을 불러오는 중…</p>;
  }

  return (
    <div className="admin-design">
      {err ? <div className="admin-dash__alert">{err}</div> : null}

      <section className="admin-design__card">
        <h2>텍스트 크기 (전역)</h2>
        <p className="admin-design__hint">루트 <code>html</code> 배율 — 모바일·PC 공통 기준입니다.</p>
        <div className="admin-design__seg">
          {(['compact', 'normal', 'large'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={textScale === v ? 'admin-design__seg-btn admin-design__seg-btn--on' : 'admin-design__seg-btn'}
              disabled={saving}
              onClick={() => {
                setTextScale(v);
                void save([{ key: 'ui.text_scale', value: v }]);
              }}
            >
              {v === 'compact' ? '축소' : v === 'normal' ? '기본' : '확대'}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-design__card">
        <h2>AI·과장 이펙트</h2>
        <p className="admin-design__hint">실시간 피드 하이라이트·금색 강조를 절제합니다 (광장 톤 정돈).</p>
        <label className="admin-design__toggle">
          <input
            type="checkbox"
            checked={hideAi}
            disabled={saving}
            onChange={(e) => {
              const next = e.target.checked;
              setHideAi(next);
              void save([{ key: 'ui.hide_ai_chrome', value: next }]);
            }}
          />
          <span>AI 스러운 강조·글로우 줄이기</span>
        </label>
      </section>

      <section className="admin-design__card">
        <h2>날씨 위젯</h2>
        <p className="admin-design__hint">홈 포털 좌측 윙 — 방콕 날씨 카드 표시 여부.</p>
        <label className="admin-design__toggle">
          <input
            type="checkbox"
            checked={weather}
            disabled={saving}
            onChange={(e) => {
              const next = e.target.checked;
              setWeather(next);
              void save([{ key: 'ui.weather_widget_enabled', value: next }]);
            }}
          />
          <span>날씨 위젯 켜기</span>
        </label>
      </section>

      <section className="admin-design__card admin-design__card--muted">
        <h2>저장소 원본 (확장용)</h2>
        <pre className="admin-design__pre">{JSON.stringify(rows, null, 2)}</pre>
      </section>
    </div>
  );
}
