import MinihomeMe from './_components/MinihomeMe';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export default async function MinihomeMePage() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  return <MinihomeMe labels={d.minihome} />;
}
