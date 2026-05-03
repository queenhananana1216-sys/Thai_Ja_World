import type { Database } from '../../../supabase/types';

export type PostsInsert = Database['public']['Tables']['posts']['Insert'];

/**
 * `posts` Insert 타입의 모든 키 — DB에 컬럼이 없거나 타입에 키가 빠지면 TS/레이더가 잡도록 유지합니다.
 * (새 컬럼 추가 시: types 재생성 → 이 배열에 키 추가 → 파이프라인·AutoForm 반영)
 */
export const POSTS_INSERT_TYPED_KEYS = [
  'author_hidden',
  'author_id',
  'category',
  'comment_count',
  'content',
  'created_at',
  'excerpt',
  'id',
  'image_urls',
  'is_anonymous',
  'is_knowledge_tip',
  'latitude',
  'location_name',
  'longitude',
  'moderation_status',
  'owner_edit_password_set',
  'plaza_id',
  'severity',
  'title',
  'updated_at',
  'view_count',
] as const satisfies readonly (keyof PostsInsert)[];

export type PostsInsertTypedKey = (typeof POSTS_INSERT_TYPED_KEYS)[number];

type _Missing = Exclude<keyof PostsInsert, PostsInsertTypedKey>;
type _Extra = Exclude<PostsInsertTypedKey, keyof PostsInsert>;
export type PostsInsertContractIntegrity = [_Missing] extends [never]
  ? [_Extra] extends [never]
    ? true
    : { error: 'extra_keys_not_in_PostsInsert'; keys: _Extra }
  : { error: 'missing_keys_from_PostsInsert'; keys: _Missing };

/** `PostsInsert` 키 집합과 배열이 어긋나면 IDE/빌드에서 `PostsInsertContractIntegrity`로 표시됩니다. */
export type _PostsInsertContractIntegrityCheck = PostsInsertContractIntegrity;
