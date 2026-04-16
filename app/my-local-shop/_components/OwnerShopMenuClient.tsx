'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type MenuAsset = {
  id: string;
  asset_type: 'menu_board' | 'price_list' | 'treatment_sheet' | 'shop_scene';
  public_url: string;
  status: 'uploaded' | 'queued' | 'processing' | 'processed' | 'failed';
  error_message?: string | null;
  created_at: string;
};

type TemplateDraft = {
  id: string;
  confidence: number;
  status: 'draft' | 'approved' | 'rejected' | 'applied';
  review_note?: string | null;
  created_at: string;
  template_json?: unknown;
  pipeline_meta?: unknown;
};

function stringifyMenu(v: unknown): string {
  try {
    const m = v ?? [];
    return JSON.stringify(m, null, 2);
  } catch {
    return '[]';
  }
}

export default function OwnerShopMenuClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [menuJson, setMenuJson] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<MenuAsset[]>([]);
  const [drafts, setDrafts] = useState<TemplateDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [assetType, setAssetType] = useState<'menu_board' | 'price_list' | 'treatment_sheet' | 'shop_scene'>('menu_board');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from('local_spots')
      .select('minihome_menu')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    if (error) setMsg(error.message);
    else setMenuJson(stringifyMenu(data?.minihome_menu));
    const snapshotRes = await fetch(`/api/local-shops/${id}/menu-assets`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (snapshotRes.ok) {
      const payload = (await snapshotRes.json()) as { assets?: MenuAsset[]; drafts?: TemplateDraft[] };
      setAssets(payload.assets ?? []);
      setDrafts(payload.drafts ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!id) return;
    let minihome_menu: unknown[];
    try {
      const m = JSON.parse(menuJson) as unknown;
      minihome_menu = Array.isArray(m) ? m : [];
    } catch {
      setMsg('메뉴는 JSON 배열 형식이어야 합니다.');
      return;
    }
    setSaving(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
      setSaving(false);
      return;
    }
    const { error } = await sb
      .from('local_spots')
      .update({ minihome_menu })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) setMsg(error.message);
    else setMsg('저장했습니다.');
    setSaving(false);
  }

  async function uploadMenuAsset(files: FileList | null) {
    if (!id || !files?.length) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('asset_type', assetType);
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (f) fd.append('file', f);
      }
      const res = await fetch(`/api/local-shops/${id}/menu-assets`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      setMsg('이미지 업로드 완료. 관리자 승인용 템플릿 초안이 생성됩니다.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        항목 예: <code>[{`{ "name", "price", "description", "image_url", "sort_order" }`}]</code> — 스키마는 관리자 문서와 동일하게 맞추면
        공개 미니홈에 반영됩니다.
      </p>
      {msg ? (
        <p style={{ fontSize: 14, color: msg === '저장했습니다.' ? '#059669' : '#dc2626' }}>{msg}</p>
      ) : null}
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>메뉴 JSON 배열</span>
        <textarea
          value={menuJson}
          onChange={(e) => setMenuJson(e.target.value)}
          rows={16}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
          }}
        />
      </label>
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
          background: '#f8fafc',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>
          메뉴판/가격표 이미지 업로드 (관리자 승인 모드)
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as 'menu_board' | 'price_list' | 'treatment_sheet' | 'shop_scene')}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12 }}
          >
            <option value="menu_board">메뉴판</option>
            <option value="price_list">가격표</option>
            <option value="treatment_sheet">시술표</option>
            <option value="shop_scene">로컬 분위기 사진</option>
          </select>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            onChange={(e) => void uploadMenuAsset(e.target.files)}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
          업로드 후 자동으로 템플릿 초안이 생성되며, 관리자가 승인해야 실제 미니홈에 반영됩니다.
        </p>
      </div>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>
          최근 업로드 자산 ({assets.length})
        </p>
        {assets.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>아직 업로드된 메뉴 이미지가 없습니다.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {assets.slice(0, 8).map((asset) => (
              <li key={asset.id} style={{ fontSize: 12, color: '#334155' }}>
                [{asset.asset_type}] {asset.status}
                {asset.public_url ? (
                  <>
                    {' '}
                    · <a href={asset.public_url} target="_blank" rel="noreferrer">이미지 보기</a>
                  </>
                ) : null}
                {asset.error_message ? ` · 오류: ${asset.error_message}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>
          템플릿 초안 상태 ({drafts.length})
        </p>
        {drafts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            생성된 초안이 없습니다. 이미지 업로드 후 잠시 뒤 다시 확인해 주세요.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {drafts.slice(0, 8).map((draft) => {
              const template =
                draft.template_json && typeof draft.template_json === 'object' && !Array.isArray(draft.template_json)
                  ? (draft.template_json as Record<string, unknown>)
                  : {};
              const rec =
                template.recommendations &&
                typeof template.recommendations === 'object' &&
                !Array.isArray(template.recommendations)
                  ? (template.recommendations as Record<string, unknown>)
                  : {};
              const concept = typeof rec.concept_summary === 'string' ? rec.concept_summary : '';
              return (
                <li key={draft.id} style={{ fontSize: 12, color: '#334155' }}>
                  {draft.status} · confidence {Math.round(Number(draft.confidence || 0) * 100)}%
                  {concept ? ` · ${concept}` : ''}
                  {draft.review_note ? ` · 검수 메모: ${draft.review_note}` : ''}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button
        type="button"
        disabled={saving || uploading}
        onClick={() => void save()}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 18px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: saving || uploading ? 'wait' : 'pointer',
          opacity: saving || uploading ? 0.7 : 1,
        }}
      >
        {saving ? '저장 중…' : '메뉴 저장'}
      </button>
    </div>
  );
}
