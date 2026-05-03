'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import type { LocalMenuRow } from './LocalDigitalMenuClient';
import {
  LOCAL_MENU_SECTION_TABS,
  normalizeLocalMenuListSection,
  type LocalMenuListSection,
} from './localMenuListSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { saveLocalMinihomeBgm } from '../_actions/saveLocalMinihomeBgm';
import { extractYoutubeVideoId } from '@/lib/youtube/extractYoutubeVideoId';

type SpotLite = {
  id: string;
  slug: string;
  name: string | null;
};

export default function LocalMinihomeMenuEditorClient({
  spot,
  initialMenus,
  minihomeUrl,
  initialMinihomeBgmUrl,
  initialThaiBalance,
}: {
  spot: SpotLite;
  initialMenus: LocalMenuRow[];
  minihomeUrl: string;
  initialMinihomeBgmUrl: string | null;
  initialThaiBalance: number;
}) {
  const sb = useMemo(() => createBrowserClient(), []);
  const [menus, setMenus] = useState<LocalMenuRow[]>(initialMenus);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<LocalMenuListSection>('menu');
  const [bgmDraft, setBgmDraft] = useState(initialMinihomeBgmUrl ?? '');
  const [savedBgmUrl, setSavedBgmUrl] = useState(initialMinihomeBgmUrl ?? '');
  const [thaiBalance, setThaiBalance] = useState(initialThaiBalance);
  const [bgmBusy, setBgmBusy] = useState(false);

  const notify = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await sb
      .from('local_menus')
      .select('*')
      .eq('local_spot_id', spot.id)
      .order('list_section', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) setMenus(data as LocalMenuRow[]);
  }, [sb, spot.id]);

  const nextSortOrder = useCallback(
    (section: LocalMenuListSection) => {
      const inSec = menus.filter((m) => normalizeLocalMenuListSection(m.list_section) === section);
      return inSec.reduce((acc, r) => Math.max(acc, r.sort_order), -1) + 1;
    },
    [menus],
  );

  const saveRow = async (row: LocalMenuRow, draft: { name: string; description: string; price: string }) => {
    const name = draft.name.trim();
    if (!name) {
      notify('이름을 입력해 주세요.');
      return;
    }
    const priceNum = Number(String(draft.price).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      notify('가격(바트)을 숫자로 입력해 주세요.');
      return;
    }
    setBusyId(row.id);
    const { error } = await sb
      .from('local_menus')
      .update({
        name,
        description: draft.description.trim() || null,
        price_thb: priceNum,
      })
      .eq('id', row.id);
    setBusyId(null);
    if (error) {
      notify(error.message);
      return;
    }
    notify('저장했습니다.');
    await refresh();
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    setBusyId(id);
    const { error } = await sb.from('local_menus').delete().eq('id', id);
    setBusyId(null);
    if (error) {
      notify(error.message);
      return;
    }
    notify('삭제했습니다.');
    await refresh();
  };

  const addRow = async (draft: { name: string; description: string; price: string }): Promise<boolean> => {
    const name = draft.name.trim();
    if (!name) {
      notify('이름을 입력해 주세요.');
      return false;
    }
    const priceNum = Number(String(draft.price).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      notify('가격(바트)을 숫자로 입력해 주세요.');
      return false;
    }
    setBusyId('__new__');
    const { error } = await sb.from('local_menus').insert({
      local_spot_id: spot.id,
      name,
      description: draft.description.trim() || null,
      price_thb: priceNum,
      is_sold_out: false,
      is_special: false,
      sort_order: nextSortOrder(tab),
      list_section: tab,
    });
    setBusyId(null);
    if (error) {
      notify(error.message);
      return false;
    }
    notify('항목을 추가했습니다.');
    await refresh();
    return true;
  };

  const spotTitle = spot.name?.trim() || spot.slug;

  const bgmWillCharge =
    Boolean(extractYoutubeVideoId(bgmDraft)) &&
    extractYoutubeVideoId(bgmDraft) !== extractYoutubeVideoId(savedBgmUrl || null);

  async function saveBgm() {
    const raw = bgmDraft.trim();
    if (raw && !extractYoutubeVideoId(raw)) {
      notify('YouTube 동영상 주소만 저장할 수 있습니다. (watch · youtu.be · shorts 등)');
      return;
    }
    setBgmBusy(true);
    const res = await saveLocalMinihomeBgm(spot.id, raw);
    setBgmBusy(false);
    if (!res.ok) {
      if (res.reason === 'INSUFFICIENT_THAI' || res.reason === 'INSUFFICIENT_DOTORI') {
        notify(`타이(THAI)가 부족합니다. (필요 ${res.need ?? 100} · 보유 ${res.have ?? 0})`);
      } else if (res.reason === 'INVALID_YOUTUBE_URL') {
        notify('인식할 수 없는 YouTube 링크입니다.');
      } else {
        notify(res.reason === 'NOT_AUTHENTICATED' ? '로그인이 필요합니다.' : `저장 실패: ${res.reason}`);
      }
      return;
    }
    setSavedBgmUrl(res.bgmUrl ?? '');
    setBgmDraft(res.bgmUrl ?? '');
    setThaiBalance(res.thaiBalance);
    notify(res.charged ? 'BGM을 저장했습니다. 타이(THAI) 100이 차감되었습니다.' : 'BGM 설정을 저장했습니다.');
  }

  async function clearBgm() {
    if (!window.confirm('BGM을 제거할까요? (타이 차감 없음)')) return;
    setBgmDraft('');
    setBgmBusy(true);
    const res = await saveLocalMinihomeBgm(spot.id, '');
    setBgmBusy(false);
    if (!res.ok) {
      notify(res.reason === 'NOT_AUTHENTICATED' ? '로그인이 필요합니다.' : `삭제 실패: ${res.reason}`);
      setBgmDraft(savedBgmUrl);
      return;
    }
    setSavedBgmUrl('');
    setThaiBalance(res.thaiBalance);
    notify('BGM을 제거했습니다.');
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">B2B · 미니홈 텍스트</p>
          <h1 className="text-xl font-black text-white">{spotTitle}</h1>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link href={minihomeUrl}>← 디지털 메뉴판 보기</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link href={`/local/${encodeURIComponent(spot.slug)}`}>미니홈 쇼룸</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {toast ? (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-50">
            {toast}
          </div>
        ) : null}

        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          메뉴판·가격표·시술표를 나누어 관리합니다. 저장 즉시 손님 화면(
          <Link href={minihomeUrl} className="text-violet-300 underline-offset-2 hover:underline">
            디지털 메뉴판
          </Link>
          )에 반영됩니다.
        </p>

        <section className="mb-8 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 to-slate-900/80 p-4 shadow-inner shadow-black/30">
          <h2 className="flex items-center gap-2 text-sm font-black text-amber-100">
            <span aria-hidden>🎵</span> BGM 설정
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/75">
            손님용 디지털 메뉴판에 재생될 배경음입니다. 저작권 정책상{' '}
            <strong className="text-amber-50">YouTube 동영상 링크만</strong> 등록할 수 있습니다 (Iframe 재생).
          </p>
          <p className="mt-2 rounded-lg border-[0.5px] border-cyan-500/30 bg-gradient-to-r from-indigo-950/50 to-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-50 backdrop-blur-md">
            BGM을 <strong>다른 영상으로 바꿀 때마다</strong> 타이(THAI) <strong>100</strong>이 차감됩니다. (같은 영상 재저장·단순
            수정은 무료 · BGM 삭제는 무료)
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            보유 타이(THAI): <span className="font-bold text-emerald-300">{thaiBalance.toLocaleString()}</span>
          </p>
          <label className="mt-3 block text-xs font-medium text-slate-300">
            YouTube URL
            <input
              value={bgmDraft}
              disabled={bgmBusy}
              onChange={(e) => setBgmDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              placeholder="https://www.youtube.com/watch?v=… 또는 https://youtu.be/…"
            />
          </label>
          {bgmWillCharge ? (
            <p className="mt-2 text-[11px] font-medium text-cyan-200/90">이번 저장에서 타이(THAI) 100이 차감됩니다.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={bgmBusy}
              className="bg-amber-600 text-white hover:bg-amber-500"
              onClick={() => void saveBgm()}
            >
              BGM 저장
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={bgmBusy || !savedBgmUrl}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => void clearBgm()}
            >
              BGM 제거
            </Button>
          </div>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as LocalMenuListSection)} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-slate-900/90 p-1">
            {LOCAL_MENU_SECTION_TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="text-[11px] font-bold data-[state=active]:bg-violet-600 sm:text-xs"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {LOCAL_MENU_SECTION_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4 outline-none">
              <SectionEditor
                section={t.key}
                rows={menus.filter((m) => normalizeLocalMenuListSection(m.list_section) === t.key)}
                busyId={busyId}
                onSave={saveRow}
                onDelete={deleteRow}
                onAdd={addRow}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function SectionEditor({
  section: _section,
  rows,
  busyId,
  onSave,
  onDelete,
  onAdd,
}: {
  section: LocalMenuListSection;
  rows: LocalMenuRow[];
  busyId: string | null;
  onSave: (row: LocalMenuRow, draft: { name: string; description: string; price: string }) => void;
  onDelete: (id: string) => void;
  onAdd: (draft: { name: string; description: string; price: string }) => Promise<boolean>;
}) {
  const [newDraft, setNewDraft] = useState({ name: '', description: '', price: '' });

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <RowForm
          key={row.id}
          row={row}
          busy={busyId === row.id}
          onSave={(d) => onSave(row, d)}
          onDelete={() => onDelete(row.id)}
        />
      ))}

      <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-4">
        <p className="mb-3 text-xs font-semibold text-slate-400">새 항목 추가</p>
        <RowFields
          draft={newDraft}
          onChange={setNewDraft}
          disabled={busyId === '__new__'}
          showDelete={false}
        />
        <Button
          type="button"
          className="mt-3 w-full bg-violet-600 text-white hover:bg-violet-500"
          disabled={busyId === '__new__'}
          onClick={() => {
            void (async () => {
              const ok = await onAdd(newDraft);
              if (ok) setNewDraft({ name: '', description: '', price: '' });
            })();
          }}
        >
          이 탭에 항목 등록
        </Button>
      </div>
    </div>
  );
}

function RowForm({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: LocalMenuRow;
  busy: boolean;
  onSave: (d: { name: string; description: string; price: string }) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState({
    name: row.name,
    description: row.description ?? '',
    price: String(row.price_thb ?? ''),
  });

  useEffect(() => {
    setDraft({
      name: row.name,
      description: row.description ?? '',
      price: String(row.price_thb ?? ''),
    });
  }, [row.id, row.name, row.description, row.price_thb]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-inner shadow-black/40">
      <RowFields draft={draft} onChange={setDraft} disabled={busy} showDelete onDelete={onDelete} />
      <Button
        type="button"
        size="sm"
        className="mt-3 bg-emerald-700 text-white hover:bg-emerald-600"
        disabled={busy}
        onClick={() => onSave(draft)}
      >
        저장
      </Button>
    </div>
  );
}

function RowFields({
  draft,
  onChange,
  disabled,
  showDelete,
  onDelete,
}: {
  draft: { name: string; description: string; price: string };
  onChange: (d: { name: string; description: string; price: string }) => void;
  disabled?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-400">
        이름
        <input
          value={draft.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          placeholder="예: 팟타이"
        />
      </label>
      <label className="block text-xs font-medium text-slate-400">
        설명
        <textarea
          value={draft.description}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          placeholder="재료, 매운맛, 추천 포인트 등"
        />
      </label>
      <label className="block text-xs font-medium text-slate-400">
        가격 (THB)
        <input
          value={draft.price}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          inputMode="decimal"
          className="mt-1 w-full max-w-[200px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          placeholder="120"
        />
      </label>
      {showDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
          disabled={disabled}
          onClick={onDelete}
        >
          삭제
        </Button>
      ) : null}
    </div>
  );
}
