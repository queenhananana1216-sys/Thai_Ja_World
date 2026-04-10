'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function asUrlArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function extFromMime(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

function storagePathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = '/storage/v1/object/public/local-spots/';
    const i = u.pathname.indexOf(marker);
    if (i < 0) return null;
    const encoded = u.pathname.slice(i + marker.length);
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export default function OwnerShopPhotosClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyDeleteIdx, setBusyDeleteIdx] = useState<number | null>(null);

  const countLabel = useMemo(() => `${urls.length}장`, [urls.length]);

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
      .select('photo_urls')
      .eq('id', id)
      .eq('owner_profile_id', user.id)
      .maybeSingle();
    if (error) {
      setMsg(error.message);
      setUrls([]);
    } else {
      setUrls(asUrlArray(data?.photo_urls));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePhotoUrls(nextUrls: string[]) {
    if (!id) return false;
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
      return false;
    }
    const { error } = await sb
      .from('local_spots')
      .update({ photo_urls: nextUrls })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) {
      setMsg(error.message);
      return false;
    }
    setUrls(nextUrls);
    return true;
  }

  async function onPick(files: FileList | null) {
    if (!files?.length || !id) return;
    setUploading(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg('세션이 만료되었습니다. 다시 로그인해 주세요.');
      setUploading(false);
      return;
    }

    const appended: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      if (!ALLOWED_TYPES.has(file.type)) {
        setMsg('JPEG, PNG, WebP, GIF 파일만 업로드할 수 있어요.');
        setUploading(false);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setMsg('파일당 최대 5MB까지 업로드할 수 있어요.');
        setUploading(false);
        return;
      }
      const path = `${user.id}/shops/${id}/${crypto.randomUUID()}.${extFromMime(file.type)}`;
      const { error: upErr } = await sb.storage.from('local-spots').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        setMsg(upErr.message);
        setUploading(false);
        return;
      }
      const { data } = sb.storage.from('local-spots').getPublicUrl(path);
      appended.push(data.publicUrl);
    }

    const ok = await savePhotoUrls([...urls, ...appended]);
    if (ok) setMsg('사진을 저장했습니다.');
    setUploading(false);
  }

  async function removeAt(index: number) {
    if (index < 0 || index >= urls.length) return;
    const targetUrl = urls[index];
    if (!targetUrl) return;
    setBusyDeleteIdx(index);
    setMsg(null);

    const next = urls.filter((_, i) => i !== index);
    const ok = await savePhotoUrls(next);
    if (!ok) {
      setBusyDeleteIdx(null);
      return;
    }

    const path = storagePathFromPublicUrl(targetUrl);
    if (path) {
      const sb = createBrowserClient();
      await sb.storage.from('local-spots').remove([path]);
    }
    setMsg('사진을 삭제했습니다.');
    setBusyDeleteIdx(null);
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
        공개 미니홈 갤러리(<code>photo_urls</code>)에 바로 반영됩니다. 현재 등록: <strong>{countLabel}</strong>
      </p>
      {msg ? (
        <p style={{ margin: 0, fontSize: 14, color: msg.includes('저장') || msg.includes('삭제') ? '#059669' : '#dc2626' }}>
          {msg}
        </p>
      ) : null}
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'fit-content',
          padding: '10px 16px',
          borderRadius: 8,
          background: '#7c3aed',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={uploading}
          style={{ display: 'none' }}
          onChange={(e) => void onPick(e.target.files)}
        />
        {uploading ? '업로드 중…' : '사진 업로드'}
      </label>
      {urls.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>아직 등록된 사진이 없습니다.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {urls.map((u, idx) => (
            <li key={`${u}-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 8, background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, background: '#f1f5f9' }}
              />
              <button
                type="button"
                onClick={() => void removeAt(idx)}
                disabled={busyDeleteIdx === idx}
                style={{
                  marginTop: 8,
                  width: '100%',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'rgba(220,38,38,0.12)',
                  color: '#b91c1c',
                  fontWeight: 700,
                  cursor: busyDeleteIdx === idx ? 'wait' : 'pointer',
                }}
              >
                {busyDeleteIdx === idx ? '삭제 중…' : '삭제'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
