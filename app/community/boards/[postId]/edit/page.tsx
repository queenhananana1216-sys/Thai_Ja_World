import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import EditPostForm from '../../_components/EditPostForm';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

type PageProps = { params: Promise<{ postId: string }> };

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function EditBoardPostPage({ params }: PageProps) {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/community/boards/${postId}/edit`)}`);
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, content, author_id, moderation_status, owner_edit_password_set')
    .eq('id', postId)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }
  if (post.moderation_status !== 'safe') {
    notFound();
  }
  if (String(post.author_id) !== user.id) {
    redirect(`/community/boards/${postId}`);
  }

  return (
    <div className="page-body board-page">
      <h1 className="board-title" style={{ marginBottom: 16 }}>
        {d.board.postEditTitle}
      </h1>
      <EditPostForm
        postId={postId}
        initialTitle={String(post.title ?? '')}
        initialContent={String(post.content ?? '')}
        ownerGateSet={Boolean(post.owner_edit_password_set)}
        board={d.board}
      />
      <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--tj-muted)' }}>
        <Link href={`/community/boards/${postId}`} style={{ color: 'var(--tj-link)' }}>
          {d.board.backToList}
        </Link>
      </p>
    </div>
  );
}
