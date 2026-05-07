'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';

type ForceNewsResponse = {
  status?: string;
  error?: string;
  reason?: string;
  paused_until?: string;
  collect?: { success?: boolean; error?: string; skipped?: boolean };
  process?: { success?: boolean; error?: string; skipped?: boolean };
};

export default function ForceNewsIngestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function runForceNews() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/force-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as ForceNewsResponse;

      if (res.status === 429 && data.status === 'paused') {
        toast.error(
          `파이프라인이 일시 정지 중입니다. ${data.reason ?? 'reason unknown'} (해제: ${data.paused_until ?? '—'})`,
        );
        return;
      }

      if (!res.ok || data.status === 'error') {
        toast.error(data.error ?? '뉴스 강제 수집에 실패했습니다.');
        return;
      }

      const c = data.collect;
      const p = data.process;
      if (c && !c.skipped && c.success === false) {
        toast.error(c.error ?? 'RSS 수집 단계에서 실패했습니다.');
        return;
      }
      if (p && !p.skipped && p.success === false) {
        toast.error(p.error ?? '요약·저장 단계에서 실패했습니다.');
        return;
      }

      toast.success('🎉 봇이 성공적으로 새로운 기사를 긁어왔습니다!');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="admin-dash__pipeline"
      style={{
        marginBottom: 22,
        borderColor: 'rgba(249, 115, 22, 0.42)',
        background:
          'linear-gradient(135deg, rgba(49, 46, 129, 0.45) 0%, rgba(88, 28, 135, 0.22) 55%, rgba(15, 23, 42, 0.85) 100%)',
      }}
      aria-label="뉴스 AI 즉시 강제 수집"
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#fed7aa' }}>
        수동 트리거 · Cron 대기 없음
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, maxWidth: '56ch' }}>
        Vercel Cron 일정과 무관하게 RSS 수집 → AI 이중 요약·DB 반영을 한 번에 실행합니다. 수 분 걸릴 수 있습니다.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => void runForceNews()}
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid rgba(251, 146, 60, 0.65)',
            borderRadius: 10,
            background: busy ? 'rgba(71, 85, 105, 0.65)' : 'linear-gradient(135deg, #ea580c 0%, #c026d3 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            padding: '12px 18px',
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : '0 12px 28px rgba(234, 88, 12, 0.35)',
          }}
        >
          {busy ? (
            <>
              <TjBrandElephantMark size={20} animate="breathe" className="shrink-0" />
              <span>실행 중…</span>
            </>
          ) : (
            <span>[🔥 뉴스 AI 즉시 강제 수집 (도파민 기사 퍼오기)]</span>
          )}
        </button>
      </div>
    </section>
  );
}
