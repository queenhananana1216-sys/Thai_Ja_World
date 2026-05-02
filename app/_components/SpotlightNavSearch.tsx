'use client';

/**
 * GNB 통합 스팟라이트 검색 — /api/search (한인 업소 · 뉴스 · 커뮤니티)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';

type OmniBusiness = {
  id: string;
  name: string;
  category: string;
  region: string;
  address: string | null;
  phone: string | null;
};

type OmniNews = {
  id: string;
  title_kr: string | null;
  title_th: string | null;
  snippet: string | null;
  created_at: string;
};

type OmniPost = {
  id: string;
  board_type: string;
  title: string;
  snippet: string | null;
  created_at: string;
};

type OmniPayload = {
  businesses: OmniBusiness[];
  news: OmniNews[];
  posts: OmniPost[];
};

const DEBOUNCE_MS = 260;

const REGION_KO: Record<string, string> = {
  bangkok: '방콕',
  pattaya: '파타야',
  chiangmai: '치앙마이',
};

const CAT_KO: Record<string, string> = {
  mart: '마트',
  pharmacy: '약국',
  hospital: '병원',
};

function bizHref(id: string): string {
  return `/korean-biz?focus=${encodeURIComponent(id)}`;
}

function newsHref(id: string): string {
  return `/news/${encodeURIComponent(id)}`;
}

function postHref(id: string): string {
  return `/boards/${encodeURIComponent(id)}`;
}

export default function SpotlightNavSearch() {
  const { locale } = useClientLocaleDictionary();
  const router = useRouter();
  const uid = useId().replace(/:/g, '');
  const inputId = `tj-spotlight-${uid}`;
  const panelId = `tj-spotlight-panel-${uid}`;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OmniPayload>({ businesses: [], news: [], posts: [] });

  const placeholder =
    locale === 'th' ? 'ค้นหา — ร้านเกาหลี · ข่าว · บอร์ด' : '검색 — 한인 업소 · 뉴스 · 커뮤니티';
  const hint =
    locale === 'th'
      ? 'พิมพ์ชื่อสถานที่หรือชื่อข่าว — รองรับพยางช์เกาหลี'
      : '업소명·뉴스 제목·글 제목 — 한글 초성(예: ㅂㅋ) 지원';

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [close]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 1) {
      setData({ businesses: [], news: [], posts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const tid = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(t)}&limit=12`, {
            cache: 'no-store',
          });
          const j = (await res.json()) as OmniPayload & { error?: string };
          setData({
            businesses: Array.isArray(j.businesses) ? j.businesses : [],
            news: Array.isArray(j.news) ? j.news : [],
            posts: Array.isArray(j.posts) ? j.posts : [],
          });
        } catch {
          setData({ businesses: [], news: [], posts: [] });
        } finally {
          setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(tid);
  }, [q]);

  const qTrim = q.trim();
  const hasResults =
    data.businesses.length > 0 || data.news.length > 0 || data.posts.length > 0;
  const showPanel = open && qTrim.length >= 1;

  function navigate(href: string) {
    close();
    setQ('');
    router.push(href);
  }

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <label className="sr-only" htmlFor={inputId}>
        {locale === 'th' ? 'ค้นหา' : '통합 검색'}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-lg opacity-70">
          🔍
        </span>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={q}
          aria-expanded={showPanel}
          aria-controls={panelId}
          className="min-h-11 w-full rounded-full border border-white/15 bg-slate-900/75 py-2.5 pl-11 pr-4 text-base text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none ring-amber-400/0 transition placeholder:text-gray-400 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/25"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      <p className="mt-1.5 text-center text-xs text-gray-400 md:text-left">{hint}</p>

      {showPanel && (
        <div
          id={panelId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-white/12 bg-gradient-to-b from-slate-950/95 via-slate-900/92 to-[#060a12]/98 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl md:p-4"
        >
          {loading && (
            <p className="px-3 py-6 text-center text-sm text-amber-100/90" role="status">
              {locale === 'th' ? 'กำลังค้นหา…' : '검색 중…'}
            </p>
          )}

          {!loading && !hasResults && (
            <p className="px-3 py-8 text-center text-sm text-gray-400">
              {locale === 'th' ? 'ไม่พบผลลัพธ์' : '일치하는 결과가 없습니다.'}
            </p>
          )}

          {!loading && hasResults && (
            <div className="space-y-5">
              {data.businesses.length > 0 ? (
                <section aria-label={locale === 'th' ? 'ร้านเกาหลี' : '한인 업소'}>
                  <h3 className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/85">
                    <span aria-hidden>🇰🇷</span> {locale === 'th' ? 'ร้านเกาหลี' : '한인 업소'}
                  </h3>
                  <ul className="space-y-1">
                    {data.businesses.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          role="option"
                          className="flex w-full flex-col rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-amber-400/25 hover:bg-white/[0.06]"
                          onClick={() => navigate(bizHref(b.id))}
                        >
                          <span className="font-semibold text-white">{b.name}</span>
                          <span className="text-xs text-cyan-200/85">
                            {CAT_KO[b.category] ?? b.category} · {REGION_KO[b.region] ?? b.region}
                          </span>
                          {b.address ? (
                            <span className="mt-1 line-clamp-1 text-xs text-gray-400">{b.address}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.news.length > 0 ? (
                <section aria-label={locale === 'th' ? 'ข่าว' : '뉴스'}>
                  <h3 className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200/85">
                    <span aria-hidden>📰</span> {locale === 'th' ? 'ข่าว' : '관련 뉴스'}
                  </h3>
                  <ul className="space-y-1">
                    {data.news.map((n) => {
                      const title =
                        (locale === 'th' ? n.title_th : n.title_kr) ?? n.title_kr ?? 'News';
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            role="option"
                            className="flex w-full flex-col rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-sky-400/25 hover:bg-white/[0.06]"
                            onClick={() => navigate(newsHref(n.id))}
                          >
                            <span className="font-semibold text-white">{title}</span>
                            {n.snippet ? (
                              <span className="mt-1 line-clamp-2 text-xs text-gray-400">{n.snippet}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {data.posts.length > 0 ? (
                <section aria-label={locale === 'th' ? 'บอร์ด' : '커뮤니티'}>
                  <h3 className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/85">
                    <span aria-hidden>💬</span> {locale === 'th' ? 'ชุมชน' : '커뮤니티'}
                  </h3>
                  <ul className="space-y-1">
                    {data.posts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          role="option"
                          className="flex w-full flex-col rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-emerald-400/25 hover:bg-white/[0.06]"
                          onClick={() => navigate(postHref(p.id))}
                        >
                          <span className="font-semibold text-white">{p.title}</span>
                          <span className="text-xs text-gray-500">
                            {p.board_type}
                            {p.snippet ? ` · ${p.snippet.slice(0, 80)}${p.snippet.length > 80 ? '…' : ''}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <Link
              prefetch={true}
              href="/search"
              className="text-xs font-semibold text-amber-200/90 underline-offset-2 hover:underline"
              onClick={close}
            >
              {locale === 'th' ? 'หน้าค้นหาเต็ม' : '통합 검색 페이지'}
            </Link>
            <Link
              prefetch={true}
              href="/community/boards"
              className="text-xs text-gray-500 hover:text-gray-300"
              onClick={close}
            >
              광장
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
