import type { Metadata } from 'next';
import { PolicyArticle, policyCopy } from '../_components/PolicyArticle';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export async function generateMetadata(): Promise<Metadata> {
  const d = getDictionary(await getLocale());
  const { title, body } = policyCopy(d, 'contact');
  return {
    title,
    description: body.replace(/\s+/g, ' ').slice(0, 155),
    robots: { index: true, follow: true },
  };
}

export default async function ContactPage() {
  const d = getDictionary(await getLocale());
  return <PolicyArticle d={d} slug="contact" />;
}
