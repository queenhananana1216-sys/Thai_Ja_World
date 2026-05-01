import { Suspense } from 'react';
import { BoardsHome } from './_components/BoardsHome';

export default function BoardsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-10 text-center text-sm text-slate-500 backdrop-blur-md">
          불러오는 중…
        </div>
      }
    >
      <BoardsHome />
    </Suspense>
  );
}
