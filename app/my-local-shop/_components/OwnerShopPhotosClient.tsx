'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

function linesToPhotos(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function photosToLines(urls: unknown): string {
  if (!urls) return '';
  if (Array.isArray(urls)) {
    return urls.map((x) => String(x).trim()).filter(Boolean).join('\n');
  }
  return '';
}

function extFromType(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

export default function OwnerShopPhotosClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [lines, setLines] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

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
    if (error) setMsg(error.message);
    else setLines(photosToLines(data?.photo_urls));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!id) return;
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
    const photo_urls = linesToPhotos(lines);
    const { error } = await sb
      .from('local_spots')
      .update({ photo_urls })
      .eq('id', id)
      .eq('owner_profile_id', user.id);
    if (error) setMsg(error.message);
    else setMsg('저장했습니다.');
    setSaving(false);
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length || !id) return;
    setUploadBusy(true);
    setMsg(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setMsg('로그인이 필요합니다.');
      setUploadBusy(false);
      return;
    }
    const added: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      const ct = file.type || '';
      if (!ALLOWED.has(ct)) {
        setMsg(`허용 형식만 업로드할 수 있습니다: JPEG, PNG, WebP, GIF`);
        setUploadBusy(false);
        return;
      }
      if (file.size > MAX_BYTES) {
        setMsg('파일당 최대 5MB입니다.');
        setUploadBusy(false);
        return;
      }
      const path = `spots/owner-${user.id}/${crypto.randomUUID()}.${extFromType(ct)}`;
      const { error: upErr } = await sb.storage.from('local-spots').upload(path, file, {
        contentType: ct,
        upsert: false,
      });
      if (upErr) {
        setMsg(upErr.message);
        setUploadBusy(false);
        return;
      }
      const { data: pub } = sb.storage.from('local-spots').getPublicUrl(path);
      if (pub?.publicUrl) added.push(pub.publicUrl);
    }
    if (added.length) {
      setLines((cur) => {
        const t = cur.trim();
        return t ? `${t}\n${added.join('\n')}` : added.join('\n');
      });
      setMsg(`${added.length}장 업로드했습니다. «저장»으로 반영하세요.`);
    }
    setUploadBusy(false);
  }

  if (!id) return null;
  if (loading) return <p style={{ color: '#64748b' }}>불러오는 중…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {msg ? (
        <p style={{ fontSize: 14, color: msg.includes('저장') || msg.includes('업로드') ? '#059669' : '#dc2626' }}>
          {msg}
        </p>
      ) : null}
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        한 줄에 이미지 URL 하나씩 입력합니다. 아래에서 파일을 올리면 공개 URL이 목록에 붙습니다.
      </p>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>갤러리 URL 목록</span>
        <textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={10}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label
          style={{
            padding: '10px 16px',
            background: '#f1f5f9',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: uploadBusy ? 'wait' : 'pointer',
            border: '1px solid #cbd5e1',
          }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: 'none' }}
            disabled={uploadBusy}
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          {uploadBusy ? '업로드 중…' : '이미지 파일 추가'}
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{
            padding: '10px 20px',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
