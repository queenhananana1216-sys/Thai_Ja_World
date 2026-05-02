'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import {
  categoryOptionsForPosting,
  type PostCategorySlug,
} from '@/lib/community/postCategories';
import {
  fireDbErrorRadar,
  scheduleSoftNavigationRefresh,
  shouldMaskRawDbError,
  USER_DB_SYNC_TOAST_MESSAGE,
} from '@/lib/db/dbErrorDefense';
import { createBrowserClient } from '@/lib/supabase/client';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export default function NewPostForm({
  locale,
  board,
  defaultCategory,
}: {
  locale: Locale;
  board: Dictionary['board'];
  defaultCategory?: PostCategorySlug | null;
}) {
  const router = useRouter();
  const cats = categoryOptionsForPosting(locale);
  const initialCat =
    defaultCategory && cats.some((c) => c.value === defaultCategory)
      ? defaultCategory
      : cats[0]?.value ?? 'free';
  const [category, setCategory] = useState<PostCategorySlug>(initialCat);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPassword2, setOwnerPassword2] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isSchemaSyncPayload(p: { code?: string; message?: string }): boolean {
    const c = p.code;
    if (c === 'schema_sync' || c === 'SCHEMA_SYNC') return true;
    const msg = p.message?.trim();
    return Boolean(msg && shouldMaskRawDbError(msg));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = createBrowserClient();
      const {
        data: { user },
        error: userErr,
      } = await sb.auth.getUser();
      if (userErr || !user) {
        router.push('/auth/login?next=/community/boards/new');
        return;
      }

      const op = ownerPassword.trim();
      const op2 = ownerPassword2.trim();
      if (op || op2) {
        if (op.length < 4 || op.length > 128) {
          setError('글 비밀번호는 4자 이상 128자 이하로 정해 주세요.');
          return;
        }
        if (op !== op2) {
          setError(board.postOwnerPasswordMismatch);
          return;
        }
      }

      const uploadUrls: string[] = [];
      const list = files ? Array.from(files).slice(0, 3) : [];
      for (const file of list) {
        if (file.size > 4 * 1024 * 1024) {
          setError('각 사진은 4MB 이하로 올려 주세요.');
          return;
        }
        const path = `${user.id}/${Date.now()}_${safeFileName(file.name)}`;
        const { error: upErr } = await sb.storage.from('post-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (upErr) {
          setError(
            `이미지 업로드 실패: ${upErr.message} (Supabase에 post-images 버킷·정책·컬럼 image_urls 적용 여부 확인)`,
          );
          return;
        }
        const { data: pub } = sb.storage.from('post-images').getPublicUrl(path);
        uploadUrls.push(pub.publicUrl);
      }

      const { data: sess } = await sb.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setError(board.mod.auth);
        router.push('/auth/login?next=/community/boards/new');
        return;
      }

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
          image_urls: uploadUrls,
          latitude,
          longitude,
          location_name: locationName.trim() || null,
          ...(op ? { owner_password: op } : {}),
        }),
      });

      let payload: { id?: string; code?: string; message?: string } = {};
      try {
        payload = (await res.json()) as typeof payload;
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        if (isSchemaSyncPayload(payload)) {
          scheduleSoftNavigationRefresh(() => router.refresh());
          toast.error(USER_DB_SYNC_TOAST_MESSAGE, { position: 'top-center' });
          fireDbErrorRadar('NewPostForm:submit');
          return;
        }
        setError(
          payload.message?.trim()
            ? payload.message
            : boardModMessage(board, payload.code),
        );
        return;
      }
      if (payload.id) {
        router.push(`/community/boards/${payload.id}`);
        router.refresh();
      }
    } catch {
      setError('네트워크 또는 브라우저 오류로 요청이 끝나지 않았습니다. 다시 시도해 주세요.');
      fireDbErrorRadar('NewPostForm:submit_throw');
    } finally {
      setLoading(false);
    }
  }

  async function attachGeoLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('이 기기/브라우저는 위치 API를 지원하지 않습니다.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGeoBusy(false);
      },
      (err) => {
        setGeoError(err.message || '위치 권한을 확인해 주세요.');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <label htmlFor="cat" className="block text-sm font-semibold text-slate-200">{board.category}</label>
      <select
        id="cat"
        value={category}
        onChange={(e) => setCategory(e.target.value as PostCategorySlug)}
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-300/60"
      >
        {cats.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="ptitle" className="block text-sm font-semibold text-slate-200">{board.title}</label>
      <input
        id="ptitle"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-300/60"
      />

      <label htmlFor="pbody" className="block text-sm font-semibold text-slate-200">{board.body}</label>
      <textarea
        id="pbody"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        minLength={2}
        className="min-h-52 w-full rounded-2xl border border-white/10 bg-slate-950/75 p-3 text-sm leading-relaxed text-slate-100 outline-none transition focus:border-violet-300/60"
      />

      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <label htmlFor="pimg" className="block text-sm font-semibold text-slate-200">{board.imagesHint}</label>
        <input
          id="pimg"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="mt-2 block w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border file:border-violet-300/40 file:bg-violet-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-100"
        />
      </div>
      {category === 'info' ? (
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
          <p className="m-0 text-sm font-semibold text-emerald-200">정보공유 위치 첨부</p>
          <button
            type="button"
            onClick={() => void attachGeoLocation()}
            className="mt-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-70"
            disabled={geoBusy}
          >
            {geoBusy ? '위치 확인 중…' : '📍 현재 위치 첨부하기'}
          </button>
          {latitude !== null && longitude !== null ? (
            <p className="mt-2 text-xs text-emerald-100">
              위도 {latitude.toFixed(6)}, 경도 {longitude.toFixed(6)}
            </p>
          ) : null}
          <label htmlFor="location-name" className="mt-2 block text-xs font-semibold text-emerald-100/90">
            위치 이름(선택)
          </label>
          <input
            id="location-name"
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="예: BTS Asok 근처"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-emerald-300/25 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none"
          />
          {geoError ? <p className="mt-2 text-xs text-rose-300">{geoError}</p> : null}
        </div>
      ) : null}

      <p className="m-0 text-xs text-slate-400">
        {board.postOwnerPasswordOptional}
      </p>
      <label htmlFor="popw" className="block text-sm font-semibold text-slate-200">{board.postOwnerPasswordPlaceholder}</label>
      <input
        id="popw"
        type="password"
        autoComplete="new-password"
        value={ownerPassword}
        onChange={(e) => setOwnerPassword(e.target.value)}
        maxLength={128}
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-300/60"
      />
      <label htmlFor="popw2" className="block text-sm font-semibold text-slate-200">{board.postOwnerPasswordRepeat}</label>
      <input
        id="popw2"
        type="password"
        autoComplete="new-password"
        value={ownerPassword2}
        onChange={(e) => setOwnerPassword2(e.target.value)}
        maxLength={128}
        className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-300/60"
      />

      {error && <p className="text-sm font-medium text-rose-300">{error}</p>}

      <button
        type="submit"
        className="rounded-full border border-violet-300/50 bg-violet-500/20 px-5 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {loading ? board.uploading : board.submit}
      </button>
    </form>
  );
}
