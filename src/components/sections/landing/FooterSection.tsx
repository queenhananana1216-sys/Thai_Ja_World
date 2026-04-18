import Link from 'next/link';

export function FooterSection() {
  return (
    <section
      className="border-t border-white/10 bg-[#040816] py-14"
      style={{ borderTop: '1px solid rgba(255,255,255,0.12)', background: '#040816', padding: '46px 0 52px' }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <h3 className="text-lg font-bold text-white" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>광고주 QR 제휴 안내</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.65, color: '#cbd5e1' }}>
          카운터 앞에 태자월드 QR 명함을 배치하면 첫 1개월 광고비를 무료로 제공합니다. 오프라인 방문객이 QR을 스캔하면
          랜딩 → 로컬 탭 → 매장 미니홈으로 연결되어 메뉴, 공지, 예약 채널까지 자연스럽게 이동합니다.
        </p>
        <ul
          className="mt-5 grid gap-2 text-sm text-slate-200 sm:grid-cols-2"
          style={{ margin: '14px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8, listStyle: 'none', padding: 0 }}
        >
          <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', padding: '8px 10px' }}>QR 배치 사진 확인</li>
          <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', padding: '8px 10px' }}>미니홈 공개 슬러그 점검</li>
          <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', padding: '8px 10px' }}>메뉴/사진 최소 2개 이상 등록</li>
          <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', padding: '8px 10px' }}>LINE 연락 채널 연결</li>
        </ul>

        <div className="mt-8 grid gap-3 md:grid-cols-3" style={{ marginTop: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <article className="rounded-2xl border border-violet-300/25 bg-violet-400/10 p-4" style={{ borderRadius: 14, border: '1px solid rgba(196,181,253,0.35)', background: 'rgba(167,139,250,0.12)', padding: 12 }}>
            <h4 className="text-sm font-semibold text-violet-100" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ddd6fe' }}>오프라인 손님 전환</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-300" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
              카운터 QR 한 번으로 고객이 미니홈 상세(메뉴, 이벤트, 공지)까지 바로 이동합니다.
            </p>
          </article>
          <article className="rounded-2xl border border-pink-300/25 bg-pink-400/10 p-4" style={{ borderRadius: 14, border: '1px solid rgba(249,168,212,0.35)', background: 'rgba(244,114,182,0.12)', padding: 12 }}>
            <h4 className="text-sm font-semibold text-pink-100" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fbcfe8' }}>운영 비용 대비 효율</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-300" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
              첫 1개월 무료로 테스트하고, 실제 문의/예약 흐름을 확인한 뒤 광고 확대를 판단할 수 있습니다.
            </p>
          </article>
          <article className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4" style={{ borderRadius: 14, border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.12)', padding: 12 }}>
            <h4 className="text-sm font-semibold text-amber-100" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fde68a' }}>성과 측정 확장</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-300" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
              QR 유입, 미니홈 클릭, 연락 채널 전환 수치 기반으로 다음 캠페인 전략을 만들 수 있습니다.
            </p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            href="/ads"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:opacity-90"
            style={{ borderRadius: 10, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#0f172a', textDecoration: 'none', background: '#fff' }}
          >
            광고 상품 보기
          </Link>
          <Link
            href="/contact"
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            style={{ borderRadius: 10, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)' }}
          >
            광고 문의하기
          </Link>
        </div>
      </div>
    </section>
  );
}
