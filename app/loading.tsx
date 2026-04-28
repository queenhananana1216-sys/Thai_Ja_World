export default function AppLoading() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-200">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-8">
        <section className="rounded-2xl border border-white/10 bg-slate-800/55 p-5 backdrop-blur-md">
          <p className="text-sm font-semibold tracking-wide text-violet-200">현재 페이지를 준비 중입니다</p>
          <p className="mt-1 text-xs text-slate-400">데이터를 불러오는 중입니다. 잠시만 기다려 주세요.</p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <article
              key={idx}
              className="rounded-2xl border border-white/10 bg-slate-800/45 p-4 backdrop-blur-md"
              aria-hidden
            >
              <div className="h-4 w-20 rounded bg-slate-700/80" />
              <div className="mt-3 h-4 w-full rounded bg-slate-700/70" />
              <div className="mt-2 h-4 w-5/6 rounded bg-slate-700/60" />
              <div className="mt-2 h-4 w-2/3 rounded bg-slate-700/50" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
