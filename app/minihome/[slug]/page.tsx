import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MinihomeRoomView from '../_components/MinihomeRoomView';
import { createServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import type { MinihomePublicRow } from '@/types/minihome';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = createServerClient();
  const { data } = await supabase
    .from('user_minihomes')
    .select('public_slug, title, tagline, intro_body, is_public')
    .eq('public_slug', slug)
    .maybeSingle();

  if (!data || !data.is_public) {
    return {
      title: d.minihome.pageTitle,
      robots: { index: false, follow: true },
    };
  }

  const title = String(data.title ?? `${data.public_slug} · miniroom`);
  const description = trimForMetaDescription(
    String(data.tagline ?? data.intro_body ?? `${title} - ${d.minihome.sectionIntro}`),
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
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function MinihomePublicPage({
  params,
}: PageProps) {
  const { slug } = await params;
  if (!slug || slug.length < 4) notFound();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_minihomes')
    .select(
      'owner_id, public_slug, title, tagline, intro_body, theme, layout_modules, is_public, visit_count_today, visit_count_total, visit_count_date, section_visibility',
    )
    .eq('public_slug', slug)
    .maybeSingle();

  if (error || !data || !data.is_public) notFound();

  const locale = await getLocale();
  const d = getDictionary(locale);
  const row = data as MinihomePublicRow;
  const pageUrl = absoluteUrl(`/minihome/${row.public_slug}`);
  const title = row.title ?? `${row.public_slug} · miniroom`;
  const description = trimForMetaDescription(
    String(row.tagline ?? row.intro_body ?? `${title} - ${d.minihome.sectionIntro}`),
    8000,
  );

  return (
    <div className="page-body board-page minihome-public-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          name: title,
          description,
          url: pageUrl,
          mainEntity: {
            '@type': 'Person',
            identifier: row.owner_id,
            name: title,
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: absoluteUrl('/'),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: d.minihome.pageTitle,
              item: absoluteUrl('/minihome'),
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: title,
              item: pageUrl,
            },
          ],
        }}
      />
      <div className="board-toolbar">
        <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          ← {d.nav.community}
        </Link>
      </div>
      <MinihomeRoomView
        data={row}
        labels={d.minihome}
        ilchon={d.ilchon}
        navCommunity={d.nav.community}
        variant="page"
      />
    </div>
  );
}
