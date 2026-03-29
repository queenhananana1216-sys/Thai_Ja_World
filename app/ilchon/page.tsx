import IlchonInbox from './_components/IlchonInbox';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export default async function IlchonPage() {
  const locale = await getLocale();
  const d = getDictionary(locale);

  return (
    <div className="page-body board-page ilchon-page-wrap">
      <header className="board-toolbar">
        <h1 className="ilchon-page__title">{d.ilchon.pageTitle}</h1>
      </header>
      <IlchonInbox labels={d.ilchon} />
    </div>
  );
}
