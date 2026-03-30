'use client';

import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';

export type LocalSpotRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  line_url: string | null;
  photo_urls: unknown;
  category: string;
  tags: string[] | null;
  sort_order: number;
  is_published: boolean;
  extra: unknown;
  owner_profile_id?: string | null;
  minihome_public_slug?: string | null;
  minihome_intro?: string | null;
  minihome_theme?: unknown;
  minihome_bgm_url?: string | null;
  minihome_menu?: unknown;
  minihome_layout_modules?: unknown;
  minihome_extra?: unknown;
  created_at: string;
  updated_at: string;
};

function photosToLines(photo_urls: unknown): string {
  if (!photo_urls) return '';
  if (Array.isArray(photo_urls)) {
    return photo_urls.map((x) => String(x).trim()).filter(Boolean).join('\n');
  }
  return '';
}

function linesToPhotos(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
const labelSpan: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' };

const CATEGORIES = [
  { v: 'restaurant', l: '맛집·식당' },
  { v: 'cafe', l: '카페' },
  { v: 'night_market', l: '야시장·길거리' },
  { v: 'massage', l: '마사지·스파' },
  { v: 'service', l: '서비스' },
  { v: 'shopping', l: '쇼핑' },
  { v: 'other', l: '기타' },
] as const;

type FormState = {
  mode: 'new' | 'edit';
  id: string;
  slug: string;
  name: string;
  description: string;
  line_url: string;
  photos: string;
  category: string;
  tags: string;
  sort_order: number;
  is_published: boolean;
  extra_json: string;
  owner_email: string;
  ownerEmailDirty: boolean;
  minihome_public_slug: string;
  minihome_intro: string;
  minihome_theme_json: string;
  minihome_menu_json: string;
  minihome_layout_json: string;
  minihome_extra_json: string;
};

function jsonPretty(v: unknown, fallback: string): string {
  if (v === undefined || v === null) return fallback;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return fallback;
  }
}

function rowToForm(row: LocalSpotRow): FormState {
  return {
    mode: 'edit',
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    line_url: row.line_url ?? '',
    photos: photosToLines(row.photo_urls),
    category: row.category,
    tags: (row.tags ?? []).join(', '),
    sort_order: row.sort_order,
    is_published: row.is_published,
    extra_json: extraToString(row.extra),
    owner_email: '',
    ownerEmailDirty: false,
    minihome_public_slug: row.minihome_public_slug ?? '',
    minihome_intro: row.minihome_intro ?? '',
    minihome_theme_json: jsonPretty(row.minihome_theme, '{}'),
    minihome_menu_json: jsonPretty(row.minihome_menu, '[]'),
    minihome_layout_json: jsonPretty(row.minihome_layout_modules, '["intro","menu","line","photos"]'),
    minihome_extra_json: jsonPretty(row.minihome_extra, '{}'),
  };
}

const emptyForm: FormState = {
  mode: 'new',
  id: '',
  slug: '',
  name: '',
  description: '',
  line_url: '',
  photos: '',
  category: 'restaurant',
  tags: '맛집, 태국',
  sort_order: 0,
  is_published: false,
  extra_json: '',
  owner_email: '',
  ownerEmailDirty: true,
  minihome_public_slug: '',
  minihome_intro: '',
  minihome_theme_json: '{}',
  minihome_menu_json: '[]',
  minihome_layout_json: '["intro","menu","line","photos"]',
  minihome_extra_json: '{}',
};

export default function LocalSpotsClient({ spots }: { spots: LocalSpotRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  async function postJson(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/local-spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setMsg(null);
    try {
      const tags = form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const photo_urls = linesToPhotos(form.photos);
      const minihomePayload = {
        minihome_public_slug: form.minihome_public_slug.trim() || null,
        minihome_intro: form.minihome_intro.trim() || null,
        minihome_theme_json: form.minihome_theme_json.trim() || null,
        minihome_menu_json: form.minihome_menu_json.trim() || null,
        minihome_layout_json: form.minihome_layout_json.trim() || null,
        minihome_extra_json: form.minihome_extra_json.trim() || null,
      };

      if (form.mode === 'new') {
        await postJson({
          action: 'create',
          name: form.name,
          slug: form.slug.trim() || undefined,
          description: form.description || null,
          line_url: form.line_url || null,
          photo_urls,
          category: form.category,
          tags,
          sort_order: form.sort_order,
          is_published: form.is_published,
          extra_json: form.extra_json.trim() || null,
          owner_email: form.owner_email.trim() || null,
          ...minihomePayload,
        });
        setMsg('등록했습니다.');
      } else {
        await postJson({
          action: 'update',
          id: form.id,
          name: form.name,
          slug: form.slug.trim() || undefined,
          description: form.description || null,
          line_url: form.line_url || null,
          photo_urls,
          category: form.category,
          tags,
          sort_order: form.sort_order,
          is_published: form.is_published,
          extra_json: form.extra_json.trim() || null,
          ...(form.ownerEmailDirty ? { owner_email: form.owner_email.trim() || null } : {}),
          ...minihomePayload,
        });
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

  async function quickPublish(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      await postJson({ action: 'publish', id });
      setMsg('공개했습니다. 필요하면 «수정»으로 문구를 다듬으세요.');
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function quickUnpublish(id: string) {
    if (!confirm('비공개로 바꿀까요? 사이트 목록에서 내려갑니다.')) return;
    setBusy(true);
    setMsg(null);
    try {
      await postJson({ action: 'unpublish', id });
      setMsg('비공개로 바꿨습니다.');
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const orderedSpots = [...spots].sort((a, b) => {
    if (a.is_published !== b.is_published) return a.is_published ? 1 : -1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const pendingCount = spots.filter((s) => !s.is_published).length;

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (f) fd.append('file', f);
      }
      const res = await fetch('/api/admin/local-spots/upload', { method: 'POST', body: fd });
      const j = (await res.json()) as { ok?: boolean; urls?: string[]; error?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      const add = (j.urls ?? []).join('\n');
      setForm((f) => {
        if (!f) return f;
        const cur = f.photos.trim();
        const merged = cur ? `${cur}\n${add}` : add;
        return { ...f, photos: merged };
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          style={{ ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
          onClick={() => {
            setMsg(null);
            setForm({ ...emptyForm });
          }}
        >
          새 로컬 가게
        </button>
        {msg && <span style={{ fontSize: 14, color: msg.includes('했습니다') ? '#059669' : '#dc2626' }}>{msg}</span>}
      </div>

      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
        사진은 <strong>한 줄에 URL 하나</strong> 또는 파일 업로드(Storage 공개 URL 자동 추가). LINE은 고객용 링크만
        넣으면 됩니다. <strong>승인 대기</strong> 행은 «승인·공개»만 눌러도 목록에 올라가고, 이후 «수정»으로
        상호·주소·문구를 다듬으면 됩니다. 공개 여부는 RLS로 비공개 시 사용자에게 안 보입니다.{' '}
        <strong>오너 이메일</strong>을 넣으면 해당 계정이 <code>/my-local-shop</code>에서 소개·메뉴·영업시간·BGM·테마 등을 (공지·이벤트·사진 일부는
        준비 중) 수정할 수
        있습니다. 미니홈 URL은 <code>/shop/공개슬러그</code> 입니다.
      </p>

      {pendingCount > 0 ? (
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#b45309',
            marginBottom: 12,
            padding: '10px 12px',
            background: '#fffbeb',
            borderRadius: 8,
            border: '1px solid #fcd34d',
          }}
        >
          승인 대기 {pendingCount}곳 — 내용 확인 후 «승인·공개» 또는 «수정»을 눌러 주세요.
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {orderedSpots.map((s) => (
          <li
            key={s.id}
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
            <div>
              <strong>{s.name}</strong>{' '}
              <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px' }}>{s.slug}</code>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {s.is_published ? '공개' : '비공개'} · 정렬 {s.sort_order} · {s.category}
                {s.owner_profile_id ? ' · 오너 연결됨' : ''}
                {s.minihome_public_slug ? (
                  <>
                    {' '}
                    · 미니홈{' '}
                    <a
                      href={`/shop/${s.minihome_public_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#7c3aed' }}
                    >
                      /shop/{s.minihome_public_slug}
                    </a>
                  </>
                ) : null}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              {!s.is_published ? (
                <button
                  type="button"
                  disabled={busy}
                  style={{ ...btnPrimary, fontSize: 12, padding: '8px 12px' }}
                  onClick={() => void quickPublish(s.id)}
                >
                  승인·공개
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  style={{ ...btnGhost, fontSize: 12, padding: '8px 12px' }}
                  onClick={() => void quickUnpublish(s.id)}
                >
                  비공개로
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                style={{ ...btnGhost, fontSize: 12, padding: '8px 12px' }}
                onClick={() => {
                  setMsg(null);
                  setForm(rowToForm(s));
                }}
              >
                수정
              </button>
            </div>
          </li>
        ))}
      </ul>

      {spots.length === 0 && (
        <p style={{ color: '#64748b' }}>아직 등록된 가게가 없습니다. «새 로컬 가게»로 추가하세요.</p>
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
              maxWidth: 620,
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
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>{form.mode === 'new' ? '새 가게' : '가게 수정'}</h2>

            <label style={fieldStyle}>
              <span style={labelSpan}>이름 *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>슬러그 (비우면 자동)</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-cafe-bangkok"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>설명</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>LINE 링크</span>
              <input
                value={form.line_url}
                onChange={(e) => setForm({ ...form, line_url: e.target.value })}
                placeholder="https://line.me/..."
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>
                오너 로그인 이메일 (가입 계정){' '}
                {form.mode === 'edit' ? '(비우고 저장하면 연결 해제 · 안 바꾸면 기존 유지하려면 칸 비우고 아래 체크)' : ''}
              </span>
              <input
                value={form.owner_email}
                onChange={(e) =>
                  setForm({ ...form, owner_email: e.target.value, ownerEmailDirty: true })
                }
                placeholder="owner@example.com"
                type="email"
                autoComplete="off"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            {form.mode === 'edit' && (
              <label style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.ownerEmailDirty}
                  onChange={(e) => setForm({ ...form, ownerEmailDirty: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>
                  위 이메일로 오너 연결을 이번 저장에 반영(체크 해제 시 기존 오너 유지)
                </span>
              </label>
            )}

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 공개 슬러그 (/shop/···)</span>
              <input
                value={form.minihome_public_slug}
                onChange={(e) => setForm({ ...form, minihome_public_slug: e.target.value })}
                placeholder="my-restaurant-bkk"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 소개 (공개 페이지 상단)</span>
              <textarea
                value={form.minihome_intro}
                onChange={(e) => setForm({ ...form, minihome_intro: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 테마 JSON (배경색·wallpaper 등)</span>
              <textarea
                value={form.minihome_theme_json}
                onChange={(e) => setForm({ ...form, minihome_theme_json: e.target.value })}
                rows={3}
                placeholder='{"accent":"#7c3aed","wallpaper_url":"..."}'
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 메뉴 JSON 배열 (오너도 /my-local-shop에서 수정 가능)</span>
              <textarea
                value={form.minihome_menu_json}
                onChange={(e) => setForm({ ...form, minihome_menu_json: e.target.value })}
                rows={4}
                placeholder='[{"name":"팟타이","price":"120฿","description":"","image_url":""}]'
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 섹션 순서 JSON 배열</span>
              <textarea
                value={form.minihome_layout_json}
                onChange={(e) => setForm({ ...form, minihome_layout_json: e.target.value })}
                rows={2}
                placeholder='["intro","menu","line","photos"]'
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>미니홈 확장 JSON</span>
              <textarea
                value={form.minihome_extra_json}
                onChange={(e) => setForm({ ...form, minihome_extra_json: e.target.value })}
                rows={2}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>사진 URL (한 줄에 하나)</span>
              <textarea
                value={form.photos}
                onChange={(e) => setForm({ ...form, photos: e.target.value })}
                rows={5}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>이미지 파일 업로드 (local-spots 버킷)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={busy}
                onChange={(e) => void onPickFiles(e.target.files)}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>카테고리</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>태그 (쉼표 구분)</span>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>정렬 숫자 (작을수록 앞)</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>공개 (비회원·회원 조회 허용)</span>
            </label>

            <label style={fieldStyle}>
              <span style={labelSpan}>확장 JSON (전화·주소·지도 등)</span>
              <textarea
                value={form.extra_json}
                onChange={(e) => setForm({ ...form, extra_json: e.target.value })}
                rows={4}
                placeholder='{"phone":"+66...","address":"...","maps_url":"..."}'
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
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
