'use client';

import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  suggested_category: string | null;
  suggested_region: string;
  status: string;
  submitter_note: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  submitted_by: string | null;
};

export default function KoreanBizSubmissionsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/korean-biz-submissions', { method: 'GET' });
      if (!res.ok) {
        setErr('목록을 불러오지 못했습니다.');
        return;
      }
      const data = (await res.json()) as { rows?: Row[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setErr('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = useCallback(
    async (id: string, status: 'approved' | 'rejected' | 'merged', note?: string) => {
      setPatching(id);
      try {
        const res = await fetch('/api/admin/korean-biz-submissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, admin_note: note ?? '' }),
        });
        if (!res.ok) {
          window.alert('저장에 실패했습니다.');
          return;
        }
        await load();
      } finally {
        setPatching(null);
      }
    },
    [load],
  );

  return (
    <div className="px-4 py-8 md:px-10 md:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">한인 업소 제보</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          유저 제보는 <code className="rounded bg-white/10 px-1 py-0.5 text-xs">korean_biz_submissions</code> 에
          저장됩니다. 실제 공개 목록 반영은 Places 크론 또는 수동으로{' '}
          <code className="rounded bg-white/10 px-1 py-0.5 text-xs">korean_businesses</code> 에 추가하세요.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">불러오는 중…</p>
      ) : err ? (
        <p className="text-rose-400">{err}</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">제보 내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-semibold">상태</th>
                <th className="px-3 py-3 font-semibold">이름</th>
                <th className="px-3 py-3 font-semibold">지역·업종</th>
                <th className="px-3 py-3 font-semibold">연락처</th>
                <th className="px-3 py-3 font-semibold">제출일</th>
                <th className="px-3 py-3 font-semibold">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-3 align-top text-slate-300">{r.status}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold text-white">{r.name}</div>
                    {r.address ? (
                      <div className="mt-1 max-w-xs text-xs text-slate-500">{r.address}</div>
                    ) : null}
                    {r.submitter_note ? (
                      <div className="mt-1 max-w-xs text-xs text-amber-200/90">{r.submitter_note}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top text-slate-300">
                    {r.suggested_region}
                    {r.suggested_category ? ` · ${r.suggested_category}` : ''}
                  </td>
                  <td className="px-3 py-3 align-top font-mono text-xs text-slate-300">{r.phone ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-slate-500">
                    {r.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={patching === r.id || r.status !== 'pending'}
                        className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                        onClick={() => void setStatus(r.id, 'approved')}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={patching === r.id || r.status !== 'pending'}
                        className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                        onClick={() => void setStatus(r.id, 'merged')}
                      >
                        반영완료
                      </button>
                      <button
                        type="button"
                        disabled={patching === r.id || r.status !== 'pending'}
                        className="rounded border border-rose-500/30 bg-rose-950/40 px-2 py-1 text-xs text-rose-100 hover:bg-rose-900/50 disabled:opacity-40"
                        onClick={() => void setStatus(r.id, 'rejected')}
                      >
                        반려
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
