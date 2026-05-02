'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import GuestGateLink from '@app/_components/GuestGateLink';
import type { Locale } from '@/i18n/types';
import { getDictionary } from '@/i18n/dictionaries';
import { localizeQuestFeedText } from '@/lib/quests/questFeedLocale';
import { isQuestMissionNoiseTitle } from '../lib/home/portalLiveFeedTitle';
import styles from './portal-2026.module.css';

/** 서버 `PortalFeedLine` 과 동형 — JSON으로 클라에 전달 */
export type PortalLiveFeedLine = {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
  liveCategory?: string | null;
  liveViewCount?: number;
  liveCreatedAt?: string | null;
  liveHighlight?: boolean;
};

export type LiveFeedTabId = 'all' | 'hot' | 'qa' | 'flea';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defaultHrefForPortalLine(idRaw: string): string {
  const id = idRaw.trim();
  if (!id) return '/boards';
  if (id.startsWith('board-')) {
    const rest = id.slice('board-'.length);
    if (UUID_RE.test(rest)) return `/boards/${encodeURIComponent(rest)}`;
  }
  if (id.startsWith('post-')) {
    const rest = id.slice('post-'.length);
    if (UUID_RE.test(rest)) return `/community/boards/${encodeURIComponent(rest)}`;
  }
  if (id.startsWith('job-')) return '/community/boards?cat=job';
  if (id.startsWith('market-')) return '/community/boards?cat=flea';
  if (UUID_RE.test(id)) return `/community/boards/${encodeURIComponent(id)}`;
  return '/boards';
}

function computeLiveFeedHotIds(lines: PortalLiveFeedLine[]): Set<string> {
  const ids = new Set<string>();
  const withViews = lines.filter((l) => (l.liveViewCount ?? 0) > 0);
  const sorted = [...withViews].sort((a, b) => (b.liveViewCount ?? 0) - (a.liveViewCount ?? 0));
  for (const row of sorted.slice(0, 2)) {
    if ((row.liveViewCount ?? 0) >= 28) ids.add(row.id);
  }
  for (const row of lines) {
    if (row.liveHighlight) ids.add(row.id);
    if ((row.liveViewCount ?? 0) >= 72) ids.add(row.id);
  }
  return ids;
}

function isLiveFeedFresh(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 12 * 60 * 1000;
}

function filterLinesByTab(lines: PortalLiveFeedLine[], tab: LiveFeedTabId): PortalLiveFeedLine[] {
  const safe = lines.filter((item) => !isQuestMissionNoiseTitle(item.title));
  if (tab === 'all') return safe;

  if (tab === 'hot') {
    const hotIds = computeLiveFeedHotIds(safe);
    const hotRows = safe.filter((l) => hotIds.has(l.id));
    if (hotRows.length > 0) {
      return [...hotRows].sort((a, b) => (b.liveViewCount ?? 0) - (a.liveViewCount ?? 0));
    }
    const byViews = [...safe].sort((a, b) => (b.liveViewCount ?? 0) - (a.liveViewCount ?? 0));
    if (byViews.some((l) => (l.liveViewCount ?? 0) > 0)) {
      return byViews.filter((l) => (l.liveViewCount ?? 0) > 0).slice(0, 20);
    }
    return safe.slice(0, 20);
  }

  if (tab === 'qa') {
    const qa = new Set(['free', 'info', 'tips', 'restaurant', 'qna']);
    return safe.filter((l) => qa.has((l.liveCategory ?? '').toLowerCase()));
  }

  if (tab === 'flea') {
    const flea = new Set(['flea', 'market']);
    return safe.filter((l) => flea.has((l.liveCategory ?? '').toLowerCase()));
  }

  return safe;
}

function liveFeedBadgeCopy(locale: Locale) {
  return {
    urgentReport: locale === 'th' ? '🚨 แจ้งด่วน' : '🚨 긴급 제보',
    hot: '🔥 HOT',
    fresh: locale === 'th' ? '🆕 เมื่อกี้' : '🆕 방금 전',
  };
}

type Props = {
  lines: PortalLiveFeedLine[];
  locale: Locale;
  isLoggedIn: boolean;
  emptyAll: string;
  emptyTab: string;
  tabAll: string;
  tabHot: string;
  tabQa: string;
  tabFlea: string;
};

export default function PortalLiveFeedMultiTab({
  lines,
  locale,
  isLoggedIn,
  emptyAll,
  emptyTab,
  tabAll,
  tabHot,
  tabQa,
  tabFlea,
}: Props) {
  const [active, setActive] = useState<LiveFeedTabId>('all');
  const d = getDictionary(locale);
  const phraseMap = d.quests.feedPhraseMap;

  const tabs: { id: LiveFeedTabId; label: string }[] = [
    { id: 'all', label: tabAll },
    { id: 'hot', label: tabHot },
    { id: 'qa', label: tabQa },
    { id: 'flea', label: tabFlea },
  ];

  const filtered = useMemo(() => filterLinesByTab(lines ?? [], active), [lines, active]);

  const listForRender = useMemo(() => {
    const base = filtered;
    if (base.length === 0) return [];
    const badges = liveFeedBadgeCopy(locale);
    const hotIds = computeLiveFeedHotIds(base);
    return base.map((item, idx) => {
      const titleLoc = localizeQuestFeedText(item?.title ?? '', locale, phraseMap);
      const subLoc = localizeQuestFeedText(item?.subtitle ?? '', locale, phraseMap);
      const cat = (item.liveCategory ?? '').toLowerCase();
      const isReport = cat === 'reports';
      const isHot = hotIds.has(item.id);
      const fresh = isLiveFeedFresh(item.liveCreatedAt ?? null);
      const chipBase =
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-1 ring-white/10';

      const chips: { key: string; node: ReactNode }[] = [];
      if (isReport) {
        chips.push({
          key: 'report',
          node: (
            <span
              className={`${chipBase} bg-gradient-to-r from-red-600 to-rose-700 text-white`}
              aria-hidden
            >
              {badges.urgentReport}
            </span>
          ),
        });
      }
      if (isHot) {
        chips.push({
          key: 'hot',
          node: (
            <span
              className={`${chipBase} bg-gradient-to-r from-orange-500 to-amber-600 text-white`}
              aria-hidden
            >
              {badges.hot}
            </span>
          ),
        });
      }
      if (fresh) {
        chips.push({
          key: 'fresh',
          node: (
            <span
              className={`${chipBase} bg-gradient-to-r from-emerald-600 to-teal-700 text-white`}
              aria-hidden
            >
              {badges.fresh}
            </span>
          ),
        });
      }

      return { item, idx, titleLoc, subLoc, chips };
    });
  }, [filtered, locale, phraseMap]);

  const emptyMessage = active === 'all' ? emptyAll : emptyTab;

  return (
    <div className="min-w-0">
      <nav
        className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={locale === 'th' ? 'เลือกชนิดฟีด' : '피드 종류 선택'}
      >
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 ${
                on
                  ? 'bg-violet-500/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-violet-300/45'
                  : 'bg-slate-900/70 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800/90 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div
        key={active}
        className={styles.portalFeedTabPanel}
      >
        {listForRender.length === 0 ? (
          <div className="px-2 py-6">
            <p className="m-0 text-center text-sm font-medium leading-relaxed text-gray-300">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="max-h-[min(28rem,62vh)] min-h-0 space-y-0 overflow-y-auto overscroll-contain px-2 py-3 md:max-h-[min(24rem,50vh)]">
            {listForRender.map(({ item, idx, titleLoc, subLoc, chips }) => (
              <li key={item?.id ? String(item.id) : `live-${idx}`} className="mb-3 list-none last:mb-1">
                <GuestGateLink
                  href={item?.href?.trim() ? item.href : defaultHrefForPortalLine(item?.id ?? '')}
                  isLoggedIn={isLoggedIn}
                  className="block rounded-2xl border border-gray-700 bg-gray-800/60 p-4 shadow-md backdrop-blur-md transition hover:border-amber-400/35 hover:bg-gray-800/75"
                >
                  {chips.length > 0 ? (
                    <div className="mb-2.5 flex min-h-5 flex-wrap gap-1.5">
                      {chips.map((c) => (
                        <span key={c.key}>{c.node}</span>
                      ))}
                    </div>
                  ) : null}
                  <span className="line-clamp-2 wrap-break-word text-base font-semibold leading-snug text-white">
                    {titleLoc}
                  </span>
                  {subLoc ? (
                    <span className="mt-1.5 block line-clamp-2 wrap-break-word text-sm leading-relaxed text-gray-300">
                      {subLoc}
                    </span>
                  ) : null}
                </GuestGateLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
