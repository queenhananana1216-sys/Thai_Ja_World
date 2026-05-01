import { NewBoardPostForm } from '../_components/NewBoardPostForm';

export default async function NewBoardPostPage({
  searchParams,
}: {
  searchParams: Promise<{ board_type?: string }>;
}) {
  const sp = await searchParams;
  const boardType = sp.board_type === 'info' ? 'info' : 'free';

  return (
    <div className="mx-auto max-w-3xl">
      <NewBoardPostForm boardType={boardType} />
    </div>
  );
}
