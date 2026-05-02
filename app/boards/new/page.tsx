import { redirect } from 'next/navigation';
import { NewBoardPostForm } from '../_components/NewBoardPostForm';

export default async function NewBoardPostPage({
  searchParams,
}: {
  searchParams: Promise<{ board_type?: string; category?: string }>;
}) {
  const sp = await searchParams;
  if (typeof sp.category === 'string' && sp.category.trim().toLowerCase() === 'greetings') {
    redirect('/community/boards/new?cat=greetings');
  }
  const boardType = sp.board_type === 'info' ? 'info' : 'free';

  return (
    <div className="mx-auto max-w-3xl">
      <NewBoardPostForm boardType={boardType} />
    </div>
  );
}
