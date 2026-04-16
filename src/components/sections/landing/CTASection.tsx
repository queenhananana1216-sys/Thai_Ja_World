import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-violet-300/30 bg-[linear-gradient(135deg,rgba(40,20,70,0.78),rgba(95,35,90,0.62))] p-8 text-white shadow-[0_20px_55px_rgba(91,33,182,0.26)] backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-extrabold sm:text-4xl">
            오늘 처음 태국에 왔다면, 이미 3년 산 사람의 정보가 여기 있습니다.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-violet-100 sm:text-base">
            가입비 없음. 월 구독 없음. 이메일 주소 하나로 30초 안에 핵심 기능을 시작할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.02]"
            >
              지금 무료 가입하기
            </Link>
            <Link
              href="/news"
              className="rounded-xl border border-violet-100/60 px-6 py-3 text-sm font-semibold text-violet-50 transition hover:bg-white/10"
            >
              게스트로 먼저 구경하기
            </Link>
          </div>
          <p className="mt-4 text-xs text-violet-100">스팸 메일 없음 · 언제든 탈퇴 가능 · 광고 계정 별도 분리</p>
        </div>
      </div>
    </section>
  );
}
