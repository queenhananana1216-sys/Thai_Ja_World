'use client';

import { useEffect, useState } from 'react';
import type { KoreanBizCategory, KoreanBizRow } from './KoreanBizHubClient';
import { matchesHangulOrChosung } from '@/lib/utils/hangul';

const CATEGORY_KO: Record<KoreanBizCategory, string> = {
  mart: '마트',
  pharmacy: '약국',
  hospital: '병원',
  vehicle_rent: '오토바이 렌트 차량렌트',
  golf: '골프 골프장 투어',
  massage_spa: '마사지 스파',
};

const REGION_KO: Record<KoreanBizRow['region'], string> = {
  bangkok: '방콕',
  pattaya: '파타야',
  chiangmai: '치앙마이',
};

type Props = {
  rows: KoreanBizRow[];
  /** 검색으로 걸러진 전체 풀 (탭 필터 전) */
  onFilteredPoolChange: (pool: KoreanBizRow[]) => void;
};

export default function KoreanBizSearch({ rows, onFilteredPoolChange }: Props) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = q.trim();
    if (!t) {
      onFilteredPoolChange(rows);
      return;
    }
    const pool = rows.filter((r) =>
      matchesHangulOrChosung(
        [
          r.name,
          r.address ?? '',
          r.phone ?? '',
          CATEGORY_KO[r.category],
          REGION_KO[r.region],
        ],
        t,
      ),
    );
    onFilteredPoolChange(pool);
  }, [q, rows, onFilteredPoolChange]);

  return (
    <div className="mb-6">
      <label className="sr-only" htmlFor="korean-biz-local-search">
        한인 업소 초성·이름 검색
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-base opacity-75">
          🔎
        </span>
        <input
          id="korean-biz-local-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="업소명 · 주소 · 초성 (예: ㅊㅇㅁㅇ → 치앙마이 약국)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/12 bg-slate-950/55 py-3 pl-11 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none backdrop-blur-xl placeholder:text-gray-500 focus:border-amber-400/35 focus:ring-2 focus:ring-amber-400/20 md:text-base"
        />
      </div>
      {q.trim() ? (
        <p className="mt-2 text-center text-xs text-gray-500 md:text-left">
          목록에서 실시간 필터링 중입니다.
        </p>
      ) : null}
    </div>
  );
}
