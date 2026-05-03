import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MinihomeUserSpaceClient from '../_components/MinihomeUserSpaceClient';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = createServerClient();
  const { data } = await supabase
    .from('user_minihomes')
    .select('public_slug, title, tagline, intro_body, is_public')
    .eq('public_slug', username)
    .maybeSingle();

  if (!data || !data.is_public) {
    return {
      title: d.minihome.pageTitle,
      robots: { index: false, follow: true },
    };
  }

  const title = String(data.title ?? `${data.public_slug} · miniroom`);
  const description = trimForMetaDescription(
    String(data.tagline ?? data.intro_body ?? `${title} — ${d.minihome.sectionIntro}`),
  );
  const url = absoluteUrl(`/minihome/${data.public_slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      siteName: d.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
    },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function MinihomeByUsernamePage({ params }: PageProps) {
  const { username } = await params;
  if (!username || username.length < 4) notFound();

  const supabase = createServerClient();

  const { data: homeRow, error: homeErr } = await supabase
    .from('user_minihomes')
    .select(
      'owner_id, public_slug, title, tagline, intro_body, is_public, visit_count_today, visit_count_total',
    )
    .eq('public_slug', username)
    .maybeSingle();

  if (homeErr || !homeRow) notFound();

  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();
  const isOwner = Boolean(user?.id && user.id === homeRow.owner_id);
  if (!homeRow.is_public && !isOwner) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', homeRow.owner_id)
    .maybeSingle();

  const { data: shell } = await supabase.from('minihomes').select('*').eq('owner_id', homeRow.owner_id).maybeSingle();

  const [{ data: diaries }, { data: galleries }, { data: guestbook }] = await Promise.all([
    supabase
      .from('minihome_diaries')
      .select('id, title, body, mood, visibility, created_at')
      .eq('owner_id', homeRow.owner_id)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('minihome_galleries')
      .select('id, title, description, cover_storage_path, items, visibility, sort_order, created_at')
      .eq('owner_id', homeRow.owner_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('minihome_guestbooks')
      .select('id, author_id, body, visibility, created_at')
      .eq('minihome_owner_id', homeRow.owner_id)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const locale = await getLocale();
  const d = getDictionary(locale);

  return (
    <div className="page-body minihome-user-page">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/community/boards" className="text-sky-300/90 underline-offset-4 hover:underline">
          ← {d.nav.community}
        </Link>
        <span className="text-white/35">|</span>
        <Link href="/minihome" className="text-white/70 hover:text-white hover:underline">
          {d.minihome.pageTitle}
        </Link>
      </div>

      <MinihomeUserSpaceClient
        locale={locale}
        labels={{
          home: '홈',
          photos: '사진첩',
          diary: '다이어리',
          guestbook: '방명록',
          status: '상태',
          write: '글쓰기',
          visibility: '공개 범위 수정',
          visibilityPublic: '전체 공개',
          visibilityFriends: '일촌만',
          visibilityPrivate: '나만 보기',
          emptyDiary: '아직 다이어리 글이 없습니다.',
          emptyPhotos: '사진첩이 비어 있습니다.',
          emptyGuest: '방명록 글이 없습니다.',
          guestPlaceholder: '일촌에게 남기는 한마디…',
          sendGuest: '등록',
          diaryTitlePlaceholder: '제목',
          diaryBodyPlaceholder: '오늘의 기록을 남겨 보세요.',
          galleryTitlePlaceholder: '사진첩 제목',
          shellIntroFallback: '환영합니다! 이 공간은 「태국에, 살자」미니홈입니다.',
        }}
        profile={{
          displayName: profile?.display_name ?? homeRow.public_slug,
          avatarUrl: profile?.avatar_url ?? null,
        }}
        home={{
          ownerId: homeRow.owner_id,
          publicSlug: homeRow.public_slug,
          title: homeRow.title,
          tagline: homeRow.tagline,
          introBody: homeRow.intro_body,
          isPublic: homeRow.is_public,
          visitToday: homeRow.visit_count_today ?? 0,
          visitTotal: homeRow.visit_count_total ?? 0,
        }}
        shell={
          shell ?? {
            owner_id: homeRow.owner_id,
            status_message: '',
            skin: {},
            bgm: null,
            visibility: 'public',
            created_at: '',
            updated_at: '',
          }
        }
        initialDiaries={diaries ?? []}
        initialGalleries={galleries ?? []}
        initialGuestbook={guestbook ?? []}
        isOwner={isOwner}
        viewerId={user?.id ?? null}
      />
    </div>
  );
}
