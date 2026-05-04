/**
 * 라이브 omni-radar SEO 구간 폴링 (표시등은 포털 위젯과 동일 데이터 소스).
 *
 *   OMNI_POLL_BASE=https://www.thaijaworld.com node scripts/poll-omni-radar-seo.mjs
 *   OMNI_POLL_INTERVAL_MS=12000 OMNI_POLL_MAX=30
 */
const base = (process.env.OMNI_POLL_BASE || 'https://www.thaijaworld.com').replace(/\/$/, '');
const interval = Math.max(3000, parseInt(process.env.OMNI_POLL_INTERVAL_MS || '12000', 10) || 12000);
const max = Math.max(1, parseInt(process.env.OMNI_POLL_MAX || '20', 10) || 20);

function ledHint(si, mb) {
  const skipped = si?.skipped === true;
  const ok = si?.seo_indexing_ok !== false && si?.ok !== false;
  if (skipped) return 'LED=초록(미설정 스킵) — Indexing JSON 넣으면 skipped=false 로 전환';
  if (ok) return 'LED=초록(또는 배치 실패 시 포털 빨강)';
  return 'LED=주의(seo_indexing_ok false 등)';
}

for (let i = 1; i <= max; i += 1) {
  const t = new Date().toISOString();
  try {
    const res = await fetch(`${base}/api/health/omni-radar`, { cache: 'no-store' });
    const j = await res.json();
    const si = j.checks?.seo_indexing ?? {};
    const mb = j.checks?.motherbrain ?? {};
    console.log(
      `[${t}] #${i}/${max} http=${res.status} healthy=${j.status === 'healthy'} seo skipped=${si.skipped} seo_indexing_ok=${si.seo_indexing_ok} mb_skipped=${mb.seo_indexing_skipped} | ${ledHint(si, mb)}`,
    );
    /** Indexing env 로드됨(skipped=false) + 레이더 판정 ok — 포털 표시등 빨강 조건 해제 */
    if (si.skipped === false && si.seo_indexing_ok === true) {
      console.log('[poll] 목표 달성: seo_indexing_skipped=false & seo_indexing_ok=true. 종료.');
      process.exit(0);
    }
  } catch (e) {
    console.error(`[${t}] fetch 실패`, e?.message || e);
  }
  if (i < max) await new Promise((r) => setTimeout(r, interval));
}
console.log('[poll] max 도달 — 아직 skipped=true 이면 Vercel GOOGLE_INDEXING_* / SERVICE_ROLE 확인');
process.exit(1);
