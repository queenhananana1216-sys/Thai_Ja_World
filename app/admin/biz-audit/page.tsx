'use client';

import { useCallback, useEffect, useState } from 'react';

type BizJoin = {
  name?: string | null;
  region?: string | null;
  category?: string | null;
  google_place_id?: string | null;
};

type Proposal = {
  id: string;
  proposal_kind: string;
  current_value: string | null;
  proposed_value: string | null;
  witty_headline: string | null;
  witty_sub: string | null;
  created_at: string;
  audit_batch_id: string;
  korean_business_id: string;
  metadata: Record<string, unknown> | null;
  korean_businesses?: BizJoin | BizJoin[] | null;
};

const KIND_PREVIEW: Record<string, string> = {
  address: '주소 변경됨',
  phone: '전화번호 업데이트됨',
  name: '상호명 차이 감지',
  coordinates: '지도 좌표 보정 필요',
  operational_status: '영업 상태 변경',
  place_not_found: 'Place 미조회 (신중 처리)',
  google_place_id: 'Place ID 정규화',
};

function joinBiz(row: Proposal): BizJoin | null {
  const j = row.korean_businesses;
  if (!j) return null;
  return Array.isArray(j) ? (j[0] ?? null) : j;
}

export default function BizAuditAdminPage() {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [runningScan, setRunningScan] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/biz-audit/proposals', { method: 'GET' });
      if (!res.ok) {
        setErr(res.status === 403 ? '관리자 권한이 필요합니다.' : '목록을 불러오지 못했습니다.');
        return;
      }
      const data = (await res.json()) as { proposals?: Proposal[] };
      setRows(Array.isArray(data.proposals) ? data.proposals : []);
    } catch {
      setErr('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(
    async (proposalId: string) => {
      setActing(proposalId);
      try {
        const res = await fetch('/api/admin/biz-audit/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          window.alert(j.error ?? '적용에 실패했습니다.');
          return;
        }
        await load();
      } finally {
        setActing(null);
      }
    },
    [load],
  );

  const dismiss = useCallback(
    async (proposalId: string) => {
      if (!window.confirm('이 제안을 기각(무시)할까요? 나중에 감사가 다시 올 수 있습니다.')) return;
      setActing(proposalId);
      try {
        const res = await fetch('/api/admin/biz-audit/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          window.alert(j.error ?? '처리에 실패했습니다.');
          return;
        }
        await load();
      } finally {
        setActing(null);
      }
    },
    [load],
  );

  const runAudit = useCallback(async () => {
    setRunningScan(true);
    setScanMsg(null);
    try {
      const res = await fetch('/api/admin/biz-audit/run', { method: 'POST' });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; scanned?: number };
      if (!res.ok) {
        setScanMsg(j.error ?? '감사 실행에 실패했습니다.');
        return;
      }
      setScanMsg(
        typeof j.scanned === 'number'
          ? `감사 배치 완료 — 스캔 ${j.scanned}건 근처까지 처리(서버 로그 참고).`
          : '감사 배치가 완료되었습니다.',
      );
      await load();
    } finally {
      setRunningScan(false);
    }
  }, [load]);

  return (
    <div className="px-4 py-8 md:px-10 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">한인망 감사 · 수정 제안</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            2주마다 돌아가는 <span className="text-slate-300">biz-radar-audit</span>가 Google Places와 대조한 뒤, 원본{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs">korean_businesses</code> 는 건드리지 않고 이
            큐에만 쌓습니다. 승인 시 지도·연락처 링크가 함께 갱신되고 Contact-Check-Bot 경로로 2차 점검됩니다.
          </p>
        </div>
        <button
          type="button"
          disabled={runningScan}
          className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-950/50 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/40 disabled:opacity-40"
          onClick={() => void runAudit()}
        >
          {runningScan ? '감사 실행 중…' : '지금 전체 감사 돌리기'}
        </button>
      </header>

      {scanMsg ? <p className="mb-4 text-sm text-amber-200/90">{scanMsg}</p> : null}

      {loading ? (
        <p className="text-slate-500">불러오는 중…</p>
      ) : err ? (
        <p className="text-rose-400">{err}</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">대기 중인 수정 제안이 없습니다. 옴니 레이더도 맑네요.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const biz = joinBiz(r);
            const bizName = biz?.name?.trim() || '이름 미상 업소';
            const headline =
              r.witty_headline?.trim() ||
              KIND_PREVIEW[r.proposal_kind] ||
              `${r.proposal_kind} 불일치`;
            const sub = r.witty_sub?.trim() || '';

            return (
              <article
                key={r.id}
                className="rounded-xl border border-white/10 bg-slate-950/50 p-4 shadow-sm md:p-5"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {biz?.region ?? '—'} {biz?.category ? `· ${biz.category}` : ''}
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-white">{bizName}</h2>
                    <p className="mt-2 text-base font-medium text-teal-200/95">{headline}</p>
                    {sub ? <p className="mt-1 text-sm leading-relaxed text-slate-400">{sub}</p> : null}
                    <dl className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <div>
                        <dt className="font-medium text-slate-500">DB 현재값</dt>
                        <dd className="mt-0.5 break-all font-mono text-slate-300">{r.current_value ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">AI 제안</dt>
                        <dd className="mt-0.5 break-all font-mono text-emerald-200/90">{r.proposed_value ?? '—'}</dd>
                      </div>
                    </dl>
                    <div className="mt-2 text-[11px] text-slate-600">
                      kind: <code>{r.proposal_kind}</code> · {r.created_at?.slice(0, 16)?.replace('T', ' ')}
                      {biz?.google_place_id ? (
                        <>
                          {' '}
                          · place <code className="text-slate-500">{biz.google_place_id.slice(0, 24)}…</code>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex shrink-0 flex-wrap gap-2 md:mt-0">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-40"
                      onClick={() => void apply(r.id)}
                    >
                      {acting === r.id ? '처리 중…' : '적용하기'}
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40"
                      onClick={() => void dismiss(r.id)}
                    >
                      기각
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
