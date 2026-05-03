'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Dictionary } from '@/i18n/dictionaries';
import {
  categoryOptionsForPosting,
  type PostCategorySlug,
} from '@/lib/community/postCategories';
import {
  fireDbErrorRadar,
  scheduleSoftNavigationRefresh,
  shouldMaskRawDbError,
} from '@/lib/db/dbErrorDefense';
import { createBrowserClient } from '@/lib/supabase/client';
import { normalizePostGeoPayload } from '@/lib/schema-autoform/postGeoFieldGroup';
import { requestThaiBalanceRefetch } from '@/lib/thaiBalanceBroadcast';
import PostGeoAutoFields, {
  type PostGeoAutoFieldsValue,
} from '@app/_components/schema-autoform/PostGeoAutoFields';

/** 첫 시도 후 최대 재시도 횟수 (1초 간격, 백그라운드) */
const POST_SUBMIT_MAX_RETRIES = 3;
const POST_SUBMIT_RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 토스트·인라인 오류 — 백엔드/런타임 원문만 (포장 문구 금지) */
function rawThrownErrorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function rawApiFailureText(httpStatus: number | null, body: unknown): string {
  return JSON.stringify({ httpStatus, body });
}

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
  const [geo, setGeo] = useState<PostGeoAutoFieldsValue>({ latitude: '', longitude: '', location_name: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const geoLabels =
    locale === 'th'
      ? {
          section: 'พิกัด (ไม่บังคับ)',
          latitude: 'ละติจูด',
          longitude: 'ลองจิจูด',
          locationName: 'ชื่อสถานที่',
          hint: 'ถ้ากรอกพิกัด ต้องกรอกทั้งคู่ — ชื่อสถานที่ได้แม้ไม่มีพิกัด',
        }
      : {
          section: '위치 (선택)',
          latitude: '위도',
          longitude: '경도',
          locationName: '장소 이름',
          hint: '위도·경도는 둘 다 입력하거나 비워 두세요. 이름만 넣을 수 있어요.',
        };

  function isSchemaSyncPayload(p: { code?: string; message?: string }): boolean {
    const c = p.code;
    if (c === 'schema_sync' || c === 'SCHEMA_SYNC') return true;
    const msg = p.message?.trim();
    return Boolean(msg && shouldMaskRawDbError(msg));
  }

  function isTransientPostFailure(
    res: Response | null,
    payload: { code?: string; message?: string },
  ): boolean {
    if (!res) return true;
    if (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429) return true;
    return isSchemaSyncPayload(payload);
  }

  async function firePgrstReloadHeal(accessToken: string): Promise<void> {
    try {
      await fetch('/api/community/posts/pgrst-reload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        keepalive: true,
      });
    } catch {
      /* ignore — 사용자에게 노출하지 않음 */
    }
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

      const geoNorm = normalizePostGeoPayload(geo);
      if (!geoNorm.ok) {
        setError(geoNorm.error);
        setLoading(false);
        return;
      }
      const g = geoNorm.value;
      const geoJson: Record<string, unknown> = {};
      if (g.latitude != null && g.longitude != null) {
        geoJson.latitude = g.latitude;
        geoJson.longitude = g.longitude;
        geoJson.location_name = g.location_name;
      } else if (g.location_name != null) {
        geoJson.location_name = g.location_name;
      }

      const requestBody = JSON.stringify({
        category,
        title: title.trim(),
        content: content.trim(),
        image_urls: uploadUrls,
        ...(op ? { owner_password: op } : {}),
        ...geoJson,
      });

      let lastPayload: {
        id?: string;
        code?: string;
        message?: string;
        details?: string | null;
        hint?: string | null;
        supabase_code?: string | null;
        supabase_details?: string | null;
        supabase_hint?: string | null;
      } = {};
      let lastHttpStatus: number | null = null;
      let exhaustedAfterTransient = false;

      for (let attempt = 0; attempt <= POST_SUBMIT_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await delay(POST_SUBMIT_RETRY_DELAY_MS);
        }

        try {
          const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: requestBody,
          });

          lastHttpStatus = res.status;

          let payload: {
            id?: string;
            code?: string;
            message?: string;
            details?: string | null;
            hint?: string | null;
            supabase_code?: string | null;
            supabase_details?: string | null;
            supabase_hint?: string | null;
          } = {};
          try {
            payload = (await res.json()) as typeof payload;
          } catch {
            /* ignore */
          }
          lastPayload = payload;

          if (res.ok && payload.id) {
            requestThaiBalanceRefetch();
            router.push(`/community/boards/${payload.id}`);
            router.refresh();
            return;
          }

          if (!isTransientPostFailure(res, payload)) {
            const line = rawApiFailureText(res.status, payload);
            setError(line);
            toast.error(line, { position: 'top-center', duration: 20_000 });
            return;
          }

          if (attempt === POST_SUBMIT_MAX_RETRIES) {
            exhaustedAfterTransient = true;
            break;
          }
        } catch (fetchErr) {
          lastPayload = {
            message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            code: 'client_fetch',
          };
          if (attempt === POST_SUBMIT_MAX_RETRIES) {
            exhaustedAfterTransient = true;
            break;
          }
        }
      }

      if (exhaustedAfterTransient) {
        void firePgrstReloadHeal(accessToken);
      }

      if (isSchemaSyncPayload(lastPayload)) {
        console.error('[NewPostForm] schema/cache failure (full payload)', lastPayload);
        scheduleSoftNavigationRefresh(() => router.refresh());
        const syncToast = rawApiFailureText(lastHttpStatus, lastPayload);
        toast.error(syncToast, { position: 'top-center', duration: 20_000 });
        setError(syncToast);
        fireDbErrorRadar('NewPostForm:submit_retry_exhausted');
        return;
      }

      const failToast = rawApiFailureText(lastHttpStatus, lastPayload);
      setError(failToast);
      toast.error(failToast, { position: 'top-center', duration: 20_000 });
      fireDbErrorRadar('NewPostForm:submit_retry_exhausted');
    } catch (err) {
      console.error('[NewPostForm] submit_throw', err);
      const raw = rawThrownErrorText(err);
      setError(raw);
      toast.error(raw, { position: 'top-center', duration: 20_000 });
      fireDbErrorRadar('NewPostForm:submit_throw');
    } finally {
      setLoading(false);
    }
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

      <PostGeoAutoFields value={geo} onChange={setGeo} labels={geoLabels} />

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
