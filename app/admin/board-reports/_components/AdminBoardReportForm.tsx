'use client';

import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminBoardReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/board-posts/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, image_urls: [] }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        setErr(j.error ?? `실패 (${res.status})`);
        return;
      }
      if (j.id) {
        router.push(`/boards/${j.id}`);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-design__card" onSubmit={(e) => void onSubmit(e)}>
      <h2 className="admin-dash__title" style={{ fontSize: '1.1rem' }}>
        새 검증 제보 글
      </h2>
      <p className="admin-design__hint">
        일반 회원은 <code>board_type = reports</code> 글을 작성할 수 없습니다. 게시 후 사용자는 댓글·공감만 가능합니다.
      </p>
      {err ? <div className="admin-dash__alert">{err}</div> : null}
      <label className="admin-design__field">
        <span className="admin-design__label">제목</span>
        <input
          className="admin-design__input"
          value={title}
          disabled={busy}
          maxLength={200}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="admin-design__field">
        <span className="admin-design__label">본문</span>
        <textarea
          className="admin-design__input"
          style={{ minHeight: 200 }}
          value={content}
          disabled={busy}
          required
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <button type="submit" className="admin-design__seg-btn admin-design__seg-btn--on" disabled={busy}>
        {busy ? '등록 중…' : '게시하기'}
      </button>
    </form>
  );
}
