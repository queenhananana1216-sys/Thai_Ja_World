'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { VisionMenuItem } from '@/lib/admin/generateLocalTemplateFromVision';

export type LocalSpotOption = { id: string; slug: string; name: string };

type ApiResult = {
  vibe_summary: string;
  vibe_tags: string[];
  selected_skin_basic_id: string;
  selected_skin_special_id: string | null;
  selected_bgm_id: string;
  menu_items: VisionMenuItem[];
  notes: string;
  resolved: {
    skin_basic: { id: string; name: string; type: string; tags: string[]; color_code?: string | null } | null;
    skin_special: { id: string; name: string; type: string; tags: string[]; color_code?: string | null } | null;
    bgm: { id: string; name: string; type: string; tags: string[]; audio_embed_url?: string | null } | null;
  };
};

function isHex(s: string | null | undefined): s is string {
  return Boolean(s && /^#[0-9a-fA-F]{3,8}$/.test(s.trim()));
}

export default function LocalTemplateWizardClient({ spots }: { spots: LocalSpotOption[] }) {
  const [localSpotId, setLocalSpotId] = useState(spots[0]?.id ?? '');
  const [businessName, setBusinessName] = useState('');
  const [exterior, setExterior] = useState<File[]>([]);
  const [interior, setInterior] = useState<File[]>([]);
  const [menu, setMenu] = useState<File[]>([]);
  const [working, setWorking] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [thumbs, setThumbs] = useState<Array<{ key: string; label: string; url: string }>>([]);

  useEffect(() => {
    const pack = (files: File[], label: string) =>
      files.map((f, i) => ({
        label,
        url: URL.createObjectURL(f),
        key: `${label}-${i}-${f.name}-${f.size}`,
      }));
    const next = [...pack(exterior, '전경'), ...pack(interior, '내부'), ...pack(menu, '메뉴')];
    setThumbs(next);
    return () => next.forEach((t) => URL.revokeObjectURL(t.url));
  }, [exterior, interior, menu]);

  function onPick(setter: (f: File[]) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const list = Array.from(e.target.files ?? []);
      setter(list);
      e.target.value = '';
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setResult(null);
    if (!businessName.trim()) {
      setMessage('업체명을 입력하세요.');
      return;
    }
    if (exterior.length + interior.length + menu.length === 0) {
      setMessage('이미지를 한 장 이상 선택하세요.');
      return;
    }

    setWorking(true);
    try {
      const form = new FormData();
      form.append('businessName', businessName.trim());
      exterior.forEach((f) => form.append('exterior', f));
      interior.forEach((f) => form.append('interior', f));
      menu.forEach((f) => form.append('menu', f));

      const res = await fetch('/api/admin/generate-local-template', { method: 'POST', body: form });
      const data = (await res.json()) as { ok?: boolean; result?: ApiResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? '분석 실패');
      setResult(data.result);
      setMessage('Vision 분석 완료 — 미리보기를 확인한 뒤 적용 대상 가게를 선택하세요.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '요청 실패');
    } finally {
      setWorking(false);
    }
  }

  async function handleApplyTemplate() {
    if (!result || !localSpotId) {
      setMessage('분석 결과와 적용할 로컬 가게를 선택하세요.');
      return;
    }
    setApplyBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/apply-local-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localSpotId,
          vision: {
            vibe_summary: result.vibe_summary,
            vibe_tags: result.vibe_tags,
            selected_skin_basic_id: result.selected_skin_basic_id,
            selected_skin_special_id: result.selected_skin_special_id,
            selected_bgm_id: result.selected_bgm_id,
            menu_items: result.menu_items,
            notes: result.notes,
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; menusInserted?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? '저장 실패');
      setMessage(`템플릿 저장 완료 — local_minihomes · local_menus ${data.menusInserted ?? 0}행 반영 · local_spots 테마 동기화`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setApplyBusy(false);
    }
  }

  const previewAccent = result
    ? isHex(result.resolved.skin_special?.color_code)
      ? result.resolved.skin_special!.color_code!.trim()
      : isHex(result.resolved.skin_basic?.color_code)
        ? result.resolved.skin_basic!.color_code!.trim()
        : '#a855f7'
    : '#a855f7';
  const previewBg = result
    ? isHex(result.resolved.skin_basic?.color_code)
      ? result.resolved.skin_basic!.color_code!.trim()
      : '#0b0f19'
    : '#0b0f19';

  const targetSpot = spots.find((s) => s.id === localSpotId);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-100">업로드 · 분석</h2>

        <label className="block text-xs text-slate-400">
          적용 대상 로컬 가게
          <select
            value={localSpotId}
            onChange={(e) => setLocalSpotId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {spots.length === 0 ? (
              <option value="">등록된 가게 없음</option>
            ) : (
              spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.slug})
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block text-xs text-slate-400">
          업체명 (Vision 컨텍스트)
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="예: 골목 카페(방콕)"
            maxLength={200}
            autoComplete="off"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <FileSlot label="가게 전경" files={exterior} onChange={onPick(setExterior)} />
          <FileSlot label="매장 내부" files={interior} onChange={onPick(setInterior)} />
          <FileSlot label="메뉴판" files={menu} onChange={onPick(setMenu)} />
        </div>

        <p className="text-xs text-slate-500">
          JPEG/PNG/WebP/GIF, 파일당 최대 6MB, 전체 최대 14장. 메뉴판 구역에서만 가격표 OCR을 수행합니다.
        </p>

        <button
          type="submit"
          disabled={working}
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {working ? 'Vision AI 분석 중…' : '스킨·BGM 매칭 + 메뉴 OCR 실행'}
        </button>
        {message && <p className="text-xs text-amber-200">{message}</p>}
      </form>

      <div className="space-y-4">
        {thumbs.length > 0 && (
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">선택한 미리보기</h3>
            <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {thumbs.map((p) => (
                <li key={p.key} className="relative">
                  <img src={p.url} alt="" className="h-16 w-16 rounded object-cover ring-1 ring-slate-600" />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-0.5 text-[9px] text-white">
                    {p.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result ? (
          <>
            <div className="rounded-xl border border-cyan-900/50 bg-slate-950/80 p-4">
              <h3 className="text-sm font-semibold text-cyan-200">미니홈 프리뷰 (모바일)</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                적용 시 <code className="text-slate-400">local_spots.minihome_theme</code> 및{' '}
                <code className="text-slate-400">local_minihomes</code> 와 동일한 색상 조합입니다.
              </p>
              <div className="mx-auto mt-4 w-[260px]">
                <div
                  className="overflow-hidden rounded-[2rem] border-4 border-slate-700 shadow-2xl"
                  style={{
                    backgroundColor: previewBg,
                    backgroundImage: `radial-gradient(ellipse 120% 80% at 50% -20%, ${previewAccent}44, transparent 55%)`,
                  }}
                >
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">Digital Menu</p>
                    <p className="truncate text-lg font-black text-white" style={{ color: previewAccent }}>
                      {businessName.trim() || targetSpot?.name || '매장명'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-white/70">{result.vibe_summary}</p>
                  </div>
                  <ul className="max-h-[220px] space-y-2 overflow-y-auto px-3 py-3">
                    {result.menu_items.length === 0 ? (
                      <li className="text-center text-[11px] text-white/40">메뉴 OCR 결과 없음</li>
                    ) : (
                      result.menu_items.map((m, i) => (
                        <li
                          key={`${m.name_ko}-${m.name_en}-${i}`}
                          className="flex justify-between gap-2 rounded-lg bg-black/25 px-2 py-2 text-[12px]"
                        >
                          <span className="min-w-0 flex-1 text-white">
                            <span className="block truncate font-medium">{m.name_ko}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-white/55">
                              {m.name_th} · {m.name_en} · {m.name_zh}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold text-sky-200">{m.price}</span>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="px-3 pb-4 pt-1">
                    <div
                      className="rounded-full py-3 text-center text-[11px] font-bold text-black shadow-lg"
                      style={{ backgroundColor: previewAccent }}
                    >
                      🔔 당일 예약 및 주문하기
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={applyBusy || !localSpotId || spots.length === 0}
                onClick={() => void handleApplyTemplate()}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {applyBusy ? 'DB 저장 중…' : '이대로 템플릿 생성 · DB 반영'}
              </button>
              {targetSpot ? (
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  대상: <span className="text-slate-300">{targetSpot.name}</span> · 공개 URL 슬러그{' '}
                  <code className="text-slate-400">/local/{targetSpot.slug}/minihome</code>
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-emerald-800/60 bg-slate-900/80 p-4">
              <h3 className="text-sm font-semibold text-emerald-200">분석 상세</h3>
              <p className="text-xs text-slate-400">태그: {result.vibe_tags.join(', ') || '—'}</p>

              <div className="grid gap-2 text-xs text-slate-300">
                <Row label="베이스 스킨" value={result.resolved.skin_basic?.name} id={result.selected_skin_basic_id} />
                <Row
                  label="스페셜 스킨"
                  value={result.resolved.skin_special?.name ?? '—'}
                  id={result.selected_skin_special_id ?? undefined}
                />
                <Row label="BGM" value={result.resolved.bgm?.name} id={result.selected_bgm_id} />
              </div>

              {result.resolved.bgm?.audio_embed_url ? (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-slate-500">BGM 미리듣기</p>
                  <div className="aspect-video w-full overflow-hidden rounded border border-slate-700">
                    <iframe
                      title="bgm-preview"
                      className="h-full w-full"
                      src={result.resolved.bgm.audio_embed_url}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">디지털 메뉴판 (OCR)</h4>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-700 bg-slate-950/60 p-2 text-sm">
                  {result.menu_items.length === 0 ? (
                    <li className="text-slate-500">메뉴 항목 없음 — 메뉴판 이미지를 추가해 보세요.</li>
                  ) : (
                    result.menu_items.map((m, i) => (
                      <li key={`${m.name_ko}-${m.name_en}-${i}`} className="border-b border-slate-800 py-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-sm font-medium text-slate-100">{m.name_ko}</span>
                          <span className="shrink-0 text-emerald-300">{m.price}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-slate-400">
                          TH {m.name_th} · EN {m.name_en} · ZH {m.name_zh}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {result.notes ? <p className="text-xs text-slate-500">메모: {result.notes}</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, id }: { label: string; value?: string; id?: string }) {
  return (
    <div className="rounded-md bg-slate-950/50 px-2 py-1">
      <span className="text-slate-500">{label}: </span>
      <span className="text-slate-100">{value ?? '—'}</span>
      {id ? <span className="ml-2 font-mono text-[10px] text-slate-600">{id.slice(0, 8)}…</span> : null}
    </div>
  );
}

function FileSlot({
  label,
  files,
  onChange,
}: {
  label: string;
  files: File[];
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block rounded-lg border border-dashed border-slate-600 bg-slate-900/60 px-2 py-3 text-center text-xs text-slate-300 hover:border-violet-500/50">
      <span className="block font-medium text-slate-200">{label}</span>
      <span className="mt-1 block text-[11px] text-slate-500">{files.length}장 선택됨</span>
      <input type="file" accept="image/*" multiple className="mt-2 w-full text-[11px]" onChange={onChange} />
    </label>
  );
}
