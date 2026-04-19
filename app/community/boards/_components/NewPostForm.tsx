'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Locale } from '@/i18n/types';
import type { Dictionary } from '@/i18n/dictionaries';
import { boardModMessage } from '@/lib/community/moderationMessages';
import {
  categoryOptionsForPostingByScope,
  type BoardScope,
  type PostCategorySlug,
} from '@/lib/community/postCategories';
import { createBrowserClient } from '@/lib/supabase/client';

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export default function NewPostForm({
  locale,
  board,
  defaultCategory,
  scope,
}: {
  locale: Locale;
  board: Dictionary['board'];
  defaultCategory?: PostCategorySlug | null;
  scope: BoardScope | null;
}) {
  const router = useRouter();
  const cats = categoryOptionsForPostingByScope(locale, scope);
  const initialCat =
    defaultCategory && cats.some((c) => c.value === defaultCategory)
      ? defaultCategory
      : cats[0]?.value ?? 'free';
  const [category, setCategory] = useState<PostCategorySlug>(initialCat);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const sb = createBrowserClient();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    const loginNext = scope
      ? `/community/boards/new?scope=${scope}`
      : '/community/boards/new';
    if (userErr || !user) {
      setLoading(false);
      router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    const uploadUrls: string[] = [];
    const list = files ? Array.from(files).slice(0, 3) : [];
    for (const file of list) {
      if (file.size > 4 * 1024 * 1024) {
        setError(board.imageTooLarge);
        setLoading(false);
        return;
      }
      const path = `${user.id}/${Date.now()}_${safeFileName(file.name)}`;
      const { error: upErr } = await sb.storage.from('post-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) {
        setError(board.imageUploadFailed);
        setLoading(false);
        return;
      }
      const { data: pub } = sb.storage.from('post-images').getPublicUrl(path);
      uploadUrls.push(pub.publicUrl);
    }

    const { data: sess } = await sb.auth.getSession();
    const accessToken = sess.session?.access_token;
    if (!accessToken) {
      setLoading(false);
      setError(board.mod.auth);
      router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        scope,
        category,
        title: title.trim(),
        content: content.trim(),
        image_urls: uploadUrls,
      }),
    });

    let payload: { id?: string; code?: string; message?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* ignore */
    }

    setLoading(false);
    if (!res.ok) {
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
  }

  return (
    <form className="board-form" onSubmit={(e) => void onSubmit(e)}>
      <label htmlFor="cat">{board.category}</label>
      <select
        id="cat"
        value={category}
        onChange={(e) => setCategory(e.target.value as PostCategorySlug)}
      >
        {cats.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="ptitle">{board.title}</label>
      <input
        id="ptitle"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />

      <label htmlFor="pbody">{board.body}</label>
      <textarea
        id="pbody"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        minLength={2}
      />

      <label htmlFor="pimg">{board.imagesHint}</label>
      <input
        id="pimg"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(e) => setFiles(e.target.files)}
      />

      {error && <p style={{ color: '#be185d', fontSize: '0.86rem' }}>{error}</p>}

      <button type="submit" className="board-form__submit" disabled={loading}>
        {loading ? board.uploading : board.submit}
      </button>
    </form>
  );
}
