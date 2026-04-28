'use client';

import { useMemo, useState } from 'react';

type Spot = {
  id: string;
  name: string;
  category: string;
  region?: string | null;
};

type Draft = {
  id: string;
  local_spot_id: string;
  confidence: number;
  status: string;
  created_at: string;
  template_json: Record<string, unknown>;
  style_profile_json: Record<string, unknown>;
};

export default function LocalShowcaseClient({ spots, drafts }: { spots: Spot[]; drafts: Draft[] }) {
  const [selectedSpotId, setSelectedSpotId] = useState(spots[0]?.id ?? '');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [assetType, setAssetType] = useState('menu_board');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [latestDraft, setLatestDraft] = useState<Draft | null>(drafts[0] ?? null);

  const selectedDraft = useMemo(
    () => latestDraft ?? drafts.find((d) => d.local_spot_id === selectedSpotId) ?? null,
    [drafts, latestDraft, selectedSpotId],
  );

  async function handleGenerate() {
    if (!selectedSpotId) return;
    setWorking(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/local-showcase/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localSpotId: selectedSpotId }),
      });
      const data = (await res.json()) as { draft?: Draft; error?: string };
      if (!res.ok || !data.draft) throw new Error(data.error ?? '생성 실패');
      setLatestDraft(data.draft);
      setMessage('템플릿 초안 생성 완료');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '생성 실패');
    } finally {
      setWorking(false);
    }
  }

  async function handleUpload() {
    if (!selectedSpotId || !uploadFile) return;
    setWorking(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('localSpotId', selectedSpotId);
      form.append('assetType', assetType);
      form.append('file', uploadFile);
      const res = await fetch('/api/admin/local-showcase/upload', { method: 'POST', body: form });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '업로드 실패');
      setMessage('이미지 업로드 완료. 이제 템플릿 생성을 누르세요.');
      setUploadFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '업로드 실패');
    } finally {
      setWorking(false);
    }
  }

  async function handleLaunch() {
    if (!selectedDraft?.id) return;
    setWorking(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/local-showcase/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: selectedDraft.id }),
      });
      const data = (await res.json()) as { business?: { name: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? '런칭 실패');
      setMessage(`정식 등록 완료: ${data.business?.name ?? 'local_businesses'}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '런칭 실패');
    } finally {
      setWorking(false);
    }
  }

  const menu = ((selectedDraft?.template_json?.minihome_menu as Array<Record<string, unknown>>) ?? []).slice(0, 8);
  const theme = (selectedDraft?.template_json?.minihome_theme as Record<string, unknown>) ?? {};

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold">1) 매장 선택 & 생성</h2>
        <select
          value={selectedSpotId}
          onChange={(e) => setSelectedSpotId(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
        >
          {spots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.name} ({spot.category})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={working || !selectedSpotId}
          className="w-full rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {working ? '생성 중...' : 'Vision-AI 템플릿 생성'}
        </button>
        <div className="mt-3 space-y-2">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="menu_board">메뉴판</option>
            <option value="price_list">가격표</option>
            <option value="shop_scene">매장 분위기</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-slate-300"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={working || !uploadFile}
            className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            사진 업로드
          </button>
        </div>
        <p className="mt-2 truncate text-xs text-slate-300">{message}</p>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold">2) 스타일 매핑 결과</h2>
        <div className="space-y-2 text-xs text-slate-200">
          <p className="truncate">confidence: {selectedDraft?.confidence ?? '-'}</p>
          <p className="truncate">wallpaper: {String(theme.wallpaper ?? '-')}</p>
          <p className="truncate">room_skin: {String(theme.room_skin ?? '-')}</p>
          <p className="truncate">bgm: {String(theme.bgm ?? theme.bgm_url ?? '-')}</p>
          <audio controls className="mt-1 w-full">
            <source src={String(theme.bgm_url ?? '')} />
          </audio>
        </div>
      </article>

      <article className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold">3) 매직 프리뷰</h2>
        <div className="mx-auto h-[420px] w-[240px] overflow-hidden rounded-[28px] border border-slate-600 bg-slate-900 p-3">
          <p className="mb-2 line-clamp-2 text-xs text-slate-300">
            {String((selectedDraft?.template_json?.minihome_intro as string) ?? '미니홈 소개')}
          </p>
          <ul className="space-y-1 overflow-y-auto text-xs">
            {menu.map((item, idx) => (
              <li key={`${String(item.name)}-${idx}`} className="rounded bg-slate-800 px-2 py-1">
                <p className="truncate">{String(item.name ?? '')}</p>
                <p className="truncate text-slate-400">{String(item.price ?? '문의')}</p>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 w-full rounded bg-emerald-500 px-2 py-2 text-xs font-semibold text-black">
            🛒 예약 / 주문하기
          </button>
        </div>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={working || !selectedDraft?.id}
          className="mt-3 w-full rounded-md bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          🚀 이 템플릿으로 매장 등록하기
        </button>
      </article>
    </section>
  );
}
