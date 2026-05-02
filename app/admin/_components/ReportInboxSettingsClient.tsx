'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = { key: string; value: unknown };

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

export default function ReportInboxSettingsClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [telegram, setTelegram] = useState('');
  const [line, setLine] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/site-settings', { cache: 'no-store' });
      if (!res.ok) {
        setErr(res.status === 403 ? '권한이 없습니다.' : '불러오지 못했습니다.');
        return;
      }
      const body = (await res.json()) as { rows?: Row[] };
      for (const x of body.rows ?? []) {
        if (x.key === 'report.telegram_url') setTelegram(str(x.value));
        if (x.key === 'report.line_url') setLine(str(x.value));
        if (x.key === 'report.whatsapp_url') setWhatsapp(str(x.value));
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

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { key: 'report.telegram_url', value: telegram },
            { key: 'report.line_url', value: line },
            { key: 'report.whatsapp_url', value: whatsapp },
          ],
        }),
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
    return <p className="admin-design__state">불러오는 중…</p>;
  }

  return (
    <section className="admin-design__card">
      <h2>제보함 SNS 링크</h2>
      <p className="admin-design__hint">
        모바일 홈 «제보함» 모달에서 열리는 1:1 채널 URL입니다. 비워 두면 해당 버튼은 «링크 미설정» 안내만
        띄웁니다. 텔레그램·라인·왓츠앱 오픈채팅·채널 링크를 그대로 넣어 주세요 (
        <code>https://</code> 권장).
      </p>
      {err ? <div className="admin-dash__alert">{err}</div> : null}

      <label className="admin-design__field">
        <span className="admin-design__label">Telegram</span>
        <input
          className="admin-design__input"
          value={telegram}
          disabled={saving}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="https://t.me/..."
        />
      </label>
      <label className="admin-design__field">
        <span className="admin-design__label">LINE</span>
        <input
          className="admin-design__input"
          value={line}
          disabled={saving}
          onChange={(e) => setLine(e.target.value)}
          placeholder="https://line.me/R/ti/g/..."
        />
      </label>
      <label className="admin-design__field">
        <span className="admin-design__label">WhatsApp</span>
        <input
          className="admin-design__input"
          value={whatsapp}
          disabled={saving}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="https://wa.me/..."
        />
      </label>

      <button
        type="button"
        className="admin-design__seg-btn admin-design__seg-btn--on"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </section>
  );
}
