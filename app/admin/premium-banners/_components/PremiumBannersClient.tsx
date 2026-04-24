'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  BANNER_PLACEMENTS,
  BANNER_ROUTE_GROUPS,
  type BannerPlacement,
  type BannerRouteGroup,
} from '@/lib/banners/types';

export type PremiumBannerRow = {
  id: string;
  /** 레거시 컬럼 — 하위 호환 */
  slot: string;
  placement: string | null;
  route_group: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  href: string | null;
  badge_text: string | null;
  sponsor_label: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  extra: unknown;
};

const PLACEMENT_OPTIONS: { v: BannerPlacement; l: string }[] = [
  { v: 'top_bar', l: '상단 바 (네비 아래)' },
  { v: 'home_strip', l: '홈 스트립 (랜딩)' },
  { v: 'wing_left', l: '좌측 윙 (≥1024px)' },
  { v: 'wing_right', l: '우측 윙 (≥1024px)' },
  { v: 'header_side', l: '헤더 옆 (검색 옆)' },
  { v: 'in_content', l: '본문 사이' },
];

const ROUTE_GROUP_OPTIONS: { v: BannerRouteGroup; l: string }[] = [
  { v: 'all', l: '전체 사이트 (all)' },
  { v: 'home', l: '홈/랜딩' },
  { v: 'community', l: '커뮤니티 전체' },
  { v: 'boards', l: '커뮤니티 게시판' },
  { v: 'tips', l: '꿀팁' },
  { v: 'news', l: '뉴스' },
  { v: 'local', l: '로컬/샵' },
  { v: 'minihome', l: '미니홈피' },
];

function extraToString(extra: unknown): string {
  if (!extra || typeof extra !== 'object') return '';
  try {
    return JSON.stringify(extra, null, 2);
  } catch {
    return '';
  }
}

const btnPrimary: CSSProperties = {
  padding: '10px 14px',
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  padding: '10px 14px',
  background: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const fieldStyle: CSSProperties = { display: 'block', marginBottom: 14 };
const labelSpan: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: '#475569',
};
const inputStyle: CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
};

type FormState = {
  mode: 'new' | 'edit';
  id: string;
  placement: BannerPlacement;
  route_group: BannerRouteGroup;
  title: string;
  subtitle: string;
  image_url: string;
  image_width: string;
  image_height: string;
  href: string;
  badge_text: string;
  sponsor_label: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  extra_json: string;
};

function effectivePlacement(row: PremiumBannerRow): BannerPlacement {
  const cand = row.placement ?? row.slot ?? '';
  return (BANNER_PLACEMENTS as readonly string[]).includes(cand)
    ? (cand as BannerPlacement)
    : 'top_bar';
}

function effectiveRouteGroup(row: PremiumBannerRow): BannerRouteGroup {
  const cand = row.route_group ?? 'all';
  return (BANNER_ROUTE_GROUPS as readonly string[]).includes(cand)
    ? (cand as BannerRouteGroup)
    : 'all';
}

function rowToForm(row: PremiumBannerRow): FormState {
  return {
    mode: 'edit',
    id: row.id,
    placement: effectivePlacement(row),
    route_group: effectiveRouteGroup(row),
    title: row.title,
    subtitle: row.subtitle ?? '',
    image_url: row.image_url ?? '',
    image_width: row.image_width ? String(row.image_width) : '',
    image_height: row.image_height ? String(row.image_height) : '',
    href: row.href ?? '',
    badge_text: row.badge_text ?? '',
    sponsor_label: row.sponsor_label ?? '',
    sort_order: row.sort_order,
    is_active: row.is_active,
    starts_at: row.starts_at ? row.starts_at.slice(0, 16) : '',
    ends_at: row.ends_at ? row.ends_at.slice(0, 16) : '',
    extra_json: extraToString(row.extra),
  };
}

const emptyForm: FormState = {
  mode: 'new',
  id: '',
  placement: 'wing_right',
  route_group: 'community',
  title: '',
  subtitle: '',
  image_url: '',
  image_width: '',
  image_height: '',
  href: '',
  badge_text: '',
  sponsor_label: '',
  sort_order: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
  extra_json: '',
};

type FilterState = {
  placement: BannerPlacement | 'any';
  route_group: BannerRouteGroup | 'any';
};

export default function PremiumBannersClient({ rows }: { rows: PremiumBannerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [filter, setFilter] = useState<FilterState>({ placement: 'any', route_group: 'any' });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter.placement !== 'any' && effectivePlacement(r) !== filter.placement) return false;
      if (filter.route_group !== 'any' && effectiveRouteGroup(r) !== filter.route_group) return false;
      return true;
    });
  }, [rows, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const k = effectivePlacement(r);
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  async function postJson(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/premium-banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  function toIsoOrNull(s: string, label: string): string | null {
    const t = s.trim();
    if (!t) return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) throw new Error(`${label} 날짜가 올바르지 않습니다.`);
    return d.toISOString();
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        placement: form.placement,
        slot: form.placement, // 레거시 컬럼 호환 — 같은 값을 계속 채워 둔다
        route_group: form.route_group,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image_url: form.image_url.trim() || null,
        image_width: form.image_width.trim() ? Number(form.image_width) || null : null,
        image_height: form.image_height.trim() ? Number(form.image_height) || null : null,
        href: form.href.trim() || null,
        badge_text: form.badge_text.trim() || null,
        sponsor_label: form.sponsor_label.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
        starts_at: toIsoOrNull(form.starts_at, '시작'),
        ends_at: toIsoOrNull(form.ends_at, '종료'),
        extra_json: form.extra_json.trim() || null,
      };

      if (form.mode === 'new') {
        await postJson({ action: 'create', ...payload });
        setMsg('등록했습니다.');
      } else {
        await postJson({ action: 'update', id: form.id, ...payload });
        setMsg('저장했습니다.');
      }
      setForm(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!form || form.mode !== 'edit') return;
    if (!confirm('삭제할까요?')) return;
    setBusy(true);
    setMsg(null);
    try {
      await postJson({ action: 'delete', id: form.id });
      setForm(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          disabled={busy}
          style={{ ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
          onClick={() => {
            setMsg(null);
            setForm({ ...emptyForm });
          }}
        >
          새 배너
        </button>

        <label style={{ fontSize: 12, color: '#475569', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          슬롯
          <select
            value={filter.placement}
            onChange={(e) =>
              setFilter((f) => ({ ...f, placement: e.target.value as FilterState['placement'] }))
            }
            style={{ ...inputStyle, width: 220 }}
          >
            <option value="any">전체</option>
            {PLACEMENT_OPTIONS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l} ({counts[p.v] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, color: '#475569', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          노출 범위
          <select
            value={filter.route_group}
            onChange={(e) =>
              setFilter((f) => ({ ...f, route_group: e.target.value as FilterState['route_group'] }))
            }
            style={{ ...inputStyle, width: 200 }}
          >
            <option value="any">전체</option>
            {ROUTE_GROUP_OPTIONS.map((r) => (
              <option key={r.v} value={r.v}>
                {r.l}
              </option>
            ))}
          </select>
        </label>

        {msg && (
          <span style={{ fontSize: 14, color: msg.includes('습니다') ? '#059669' : '#dc2626' }}>
            {msg}
          </span>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map((r) => {
          const placement = effectivePlacement(r);
          const routeGroup = effectiveRouteGroup(r);
          return (
            <li
              key={r.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt=""
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0,
                      background: '#f1f5f9',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: '#f1f5f9',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{r.title || '(제목 없음)'}</strong>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    <code style={{ background: '#f1f5f9', padding: '1px 6px', marginRight: 6 }}>
                      {placement}
                    </code>
                    <code style={{ background: '#eef2ff', padding: '1px 6px', marginRight: 6 }}>
                      {routeGroup}
                    </code>
                    정렬 {r.sort_order} · {r.is_active ? '활성' : '비활성'}
                    {r.starts_at ? ` · 시작 ${r.starts_at.slice(0, 10)}` : ''}
                    {r.ends_at ? ` · 종료 ${r.ends_at.slice(0, 10)}` : ''}
                  </div>
                  {r.href ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, wordBreak: 'break-all' }}>
                      {r.href}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                style={{ ...btnGhost, fontSize: 12, padding: '8px 12px', flexShrink: 0 }}
                onClick={() => {
                  setMsg(null);
                  setForm(rowToForm(r));
                }}
              >
                수정
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p style={{ color: '#64748b' }}>조건에 맞는 배너가 없습니다.</p>
      )}

      {form && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 80,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            overflow: 'auto',
          }}
          role="presentation"
          onClick={() => !busy && setForm(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              padding: 20,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
            }}
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>
              {form.mode === 'new' ? '새 배너' : '배너 수정'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={fieldStyle}>
                <span style={labelSpan}>슬롯 (위치)</span>
                <select
                  value={form.placement}
                  onChange={(e) =>
                    setForm({ ...form, placement: e.target.value as BannerPlacement })
                  }
                  style={inputStyle}
                >
                  {PLACEMENT_OPTIONS.map((p) => (
                    <option key={p.v} value={p.v}>
                      {p.l}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldStyle}>
                <span style={labelSpan}>노출 범위 (route_group)</span>
                <select
                  value={form.route_group}
                  onChange={(e) =>
                    setForm({ ...form, route_group: e.target.value as BannerRouteGroup })
                  }
                  style={inputStyle}
                >
                  {ROUTE_GROUP_OPTIONS.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.l}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={fieldStyle}>
              <span style={labelSpan}>제목 *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>부제</span>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>이미지 URL</span>
              <input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                style={inputStyle}
                placeholder="https://… 또는 /path"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={fieldStyle}>
                <span style={labelSpan}>이미지 가로 (px, 선택)</span>
                <input
                  type="number"
                  min={1}
                  value={form.image_width}
                  onChange={(e) => setForm({ ...form, image_width: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                <span style={labelSpan}>이미지 세로 (px, 선택)</span>
                <input
                  type="number"
                  min={1}
                  value={form.image_height}
                  onChange={(e) => setForm({ ...form, image_height: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>
            <p style={{ margin: '-6px 0 10px', fontSize: 11, color: '#94a3b8' }}>
              두 값이 있으면 레이아웃이 미리 자리를 잡아 이미지 로딩 시 화면이 튀지 않습니다 (CLS 방지).
            </p>

            <label style={fieldStyle}>
              <span style={labelSpan}>링크 (href)</span>
              <input
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                style={inputStyle}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={fieldStyle}>
                <span style={labelSpan}>뱃지</span>
                <input
                  value={form.badge_text}
                  onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                <span style={labelSpan}>스폰서 라벨 (예: AD · Sponsored)</span>
                <input
                  value={form.sponsor_label}
                  onChange={(e) => setForm({ ...form, sponsor_label: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={fieldStyle}>
                <span style={labelSpan}>정렬 (작을수록 앞)</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                  }
                  style={inputStyle}
                />
              </label>
              <label
                style={{
                  ...fieldStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 24,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>활성 (비활성 시 비노출)</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={fieldStyle}>
                <span style={labelSpan}>시작 (비우면 즉시)</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                <span style={labelSpan}>종료 (비우면 무기한)</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={fieldStyle}>
              <span style={labelSpan}>확장 JSON (선택 · campaign_id / alt_ko / alt_th)</span>
              <textarea
                value={form.extra_json}
                onChange={(e) => setForm({ ...form, extra_json: e.target.value })}
                rows={3}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={busy}
                style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}
                onClick={() => void onSave()}
              >
                저장
              </button>
              <button type="button" disabled={busy} style={btnGhost} onClick={() => setForm(null)}>
                닫기
              </button>
              {form.mode === 'edit' && (
                <button
                  type="button"
                  disabled={busy}
                  style={{ ...btnGhost, borderColor: '#fca5a5', color: '#b91c1c' }}
                  onClick={() => void onDelete()}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
