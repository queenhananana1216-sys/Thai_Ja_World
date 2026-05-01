import type { SupabaseClient } from '@supabase/supabase-js';

export type UploadBoardImageResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string };

/**
 * `board_images` 버킷에 업로드하고 공개 URL을 반환합니다.
 * 클라이언트에서 로그인 세션이 있는 Supabase 클라이언트로 호출하세요.
 */
export async function uploadBoardImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<UploadBoardImageResult> {
  const trimmedId = userId.trim();
  if (!trimmedId) {
    return { ok: false, error: 'user_id_required' };
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'image';
  const path = `${trimmedId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from('board_images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = supabase.storage.from('board_images').getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl, path };
}
