'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { uploadBoardImage } from '@/lib/board/uploadBoardImage';
import {
  fireDbErrorRadar,
  shouldMaskRawDbError,
  USER_DB_SYNC_TOAST_MESSAGE,
} from '@/lib/db/dbErrorDefense';
import { createBrowserClient } from '@/lib/supabase/client';
import { LocationPicker, type LocationValue } from './LocationPicker';
import type { BoardPostRow } from './types';

type Props = {
  boardType: 'free' | 'info';
  mode?: 'create' | 'edit';
  postId?: string;
  initial?: Partial<BoardPostRow>;
};

export function NewBoardPostForm({
  boardType,
  mode = 'create',
  postId,
  initial,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>(initial?.image_urls ?? []);
  const [loc, setLoc] = useState<LocationValue>({
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    address: initial?.address ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (mode === 'edit') return '글 수정';
    return boardType === 'info' ? '정보 공유 글쓰기' : '자유 게시판 글쓰기';
  }, [boardType, mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sb = createBrowserClient();
    const {
      data: { user },
      error: ue,
    } = await sb.auth.getUser();
    if (ue || !user) {
      setLoading(false);
      router.push(
        `/auth/login?next=${encodeURIComponent(`/boards/new?board_type=${boardType}`)}`,
      );
      return;
    }

    if (boardType === 'info' && (loc.lat == null || loc.lng == null)) {
      setError('정보 공유 게시판에는 지도에서 위치를 선택해 주세요.');
      setLoading(false);
      return;
    }

    const newUrls: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('각 이미지는 5MB 이하여야 합니다.');
        setLoading(false);
        return;
      }
      const up = await uploadBoardImage(sb, file, user.id);
      if (!up.ok) {
        setError(up.error);
        setLoading(false);
        return;
      }
      newUrls.push(up.publicUrl);
    }

    const image_urls = [...existingUrls, ...newUrls];

    const { data: sess } = await sb.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setLoading(false);
      setError('세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }

    const body = {
      board_type: boardType,
      title: title.trim(),
      content: content.trim(),
      image_urls,
      lat: boardType === 'info' ? loc.lat : null,
      lng: boardType === 'info' ? loc.lng : null,
      address: boardType === 'info' ? loc.address : null,
    };

    if (mode === 'edit' && postId) {
      const res = await fetch(`/api/boards/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      setLoading(false);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (j.code === 'SCHEMA_SYNC' || shouldMaskRawDbError(String(j.error ?? ''))) {
          toast.error(USER_DB_SYNC_TOAST_MESSAGE, { position: 'top-center' });
          fireDbErrorRadar('NewBoardPostForm:edit');
          return;
        }
        setError(j.error ?? '수정 실패');
        return;
      }
      toast.success('수정되었습니다.', { position: 'top-center' });
      router.push(`/boards/${postId}`);
      router.refresh();
      return;
    }

    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
      code?: string;
    };
    setLoading(false);

    if (!res.ok || !json.id) {
      if (json.code === 'SCHEMA_SYNC' || shouldMaskRawDbError(String(json.error ?? ''))) {
        toast.error(USER_DB_SYNC_TOAST_MESSAGE, { position: 'top-center' });
        fireDbErrorRadar('NewBoardPostForm:create');
        return;
      }
      setError(json.error ?? '등록 실패');
      return;
    }

    if (boardType === 'info') {
      toast.success('[미션 달성! 정보 공유로 🎁 24 도토리 획득]', {
        position: 'top-center',
        duration: 4500,
      });
    } else {
      toast.success('글이 등록되었습니다.', { position: 'top-center' });
    }

    router.push(`/boards/${json.id}`);
    router.refresh();
  }

  function removeExisting(url: string) {
    setExistingUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950/90 to-indigo-950/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-6"
    >
      <h1 className="text-lg font-black tracking-tight text-slate-50">{heading}</h1>
      <p className="mt-1 text-[11px] text-slate-500">
        {boardType === 'info'
          ? '사진·위치가 함께 저장됩니다. 지도를 클릭하거나 검색해 주소를 맞춰 주세요.'
          : '사진과 글을 고밀도 카드로 모아 보여 줍니다.'}
      </p>

      <label className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
        제목
      </label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={200}
        className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none backdrop-blur-md focus:border-amber-400/40"
      />

      <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
        본문
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none backdrop-blur-md focus:border-amber-400/40"
      />

      <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
        이미지 (다중 선택)
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="mt-1 w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-100"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      {files.length > 0 ? (
        <p className="mt-1 text-[10px] text-slate-500">{files.length}개 파일 선택됨</p>
      ) : null}

      {existingUrls.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {existingUrls.map((url) => (
            <span
              key={url}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
            >
              첨부
              <button
                type="button"
                className="text-rose-300 hover:text-rose-200"
                onClick={() => removeExisting(url)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {boardType === 'info' ? (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300/90">
            위치 (필수)
          </p>
          <div className="mt-2">
            <LocationPicker value={loc} onChange={setLoc} />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-amber-400/35 bg-amber-500/20 px-6 py-2.5 text-sm font-bold text-amber-50 backdrop-blur-md hover:bg-amber-500/30 disabled:opacity-50"
        >
          {loading ? '처리 중…' : mode === 'edit' ? '저장' : '등록'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10"
          onClick={() => router.back()}
        >
          취소
        </button>
      </div>
    </form>
  );
}
