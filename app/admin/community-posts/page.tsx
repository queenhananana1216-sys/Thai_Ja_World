/**
 * /admin/community-posts — 광장 게시글(중고·알바 등) 관리자 삭제
 */
import Link from 'next/link';
import { categoryLabel } from '@/lib/community/postCategories';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getLocale } from '@/i18n/get-locale';
import AdminCommunityPostsClient, { type AdminPostRow } from './_components/AdminCommunityPostsClient';

export default async function AdminCommunityPostsPage() {
  const locale = await getLocale();
  let rows: AdminPostRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('posts')
      .select('id, title, category, created_at, moderation_status')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      err = error.message;
    } else {
      rows = (data ?? []).map((r) => ({
        id: r.id as string,
        title: String(r.title ?? ''),
        category: String(r.category ?? ''),
        categoryLabel: categoryLabel(String(r.category ?? ''), locale),
        created_at: String(r.created_at ?? ''),
        moderation_status: String(r.moderation_status ?? ''),
      }));
    }
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="admin-page">
      <p style={{ margin: '0 0 8px' }}>
        <Link href="/admin" style={{ color: '#7c3aed', fontSize: 13 }}>
          ← 관리자 개요
        </Link>
      </p>
      <h1 className="admin-dash__title">광장 게시글 관리</h1>
      <p className="admin-dash__lead">
        중고·알바·자유 등 <code>public.posts</code> 전체입니다. 작성자는 글 상세·목록의 «내 글 메뉴»에서도 삭제할 수 있고, 여기서는
        운영자가 어떤 글이든 삭제할 수 있습니다. 삭제 시 댓글·반응은 DB 제약에 따라 함께 제거됩니다.
      </p>
      {err ? <div className="admin-dash__alert">{err}</div> : null}
      <AdminCommunityPostsClient initial={rows} />
    </main>
  );
}
