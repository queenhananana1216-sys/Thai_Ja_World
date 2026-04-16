import type { Metadata } from 'next';
import { getLocale } from '@/i18n/get-locale';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '태자월드 광고 제휴 | 태국 한인 로컬 가게 성과형 홍보',
    description:
      '로컬 가게를 위한 태자월드 광고 제휴 안내. QR 유입, 미니홈 운영, 커뮤니티 신뢰 기반으로 실제 전환을 만드는 광고 모델을 소개합니다.',
    robots: { index: true, follow: true },
  };
}

export default async function AdsPage() {
  const locale = await getLocale();
  const isThai = locale === 'th';

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <section className="rounded-3xl border border-violet-300/25 bg-[linear-gradient(130deg,#1e1b4b_0%,#3b0764_100%)] p-8 text-white shadow-[0_20px_50px_rgba(30,27,75,0.45)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">
          {isThai ? 'ข้อเสนอสำหรับพาร์ทเนอร์ร้านค้า' : '로컬 파트너 제휴 안내'}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          {isThai
            ? 'โฆษณาร้านของคุณใน Thai Ja World ด้วยโมเดลที่วัดผลได้จริง'
            : '태자월드 광고 제휴, “보이는 광고”가 아니라 “오는 광고”로 설계합니다'}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-violet-50 sm:text-base">
          {isThai
            ? 'ลูกค้าหน้าร้านสแกน QR แล้วเข้าหน้ามินิโฮมร้านได้ทันที ดูเมนู ประกาศ และติดต่อ LINE ได้ในคลิกเดียว'
            : '오프라인 방문객이 QR을 스캔하면 매장 미니홈으로 연결되고, 메뉴/공지/예약/문의까지 한 번에 이어지는 전환형 동선을 제공합니다.'}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 no-underline transition hover:opacity-90"
          >
            {isThai ? 'สอบถามแพ็กเกจโฆษณา' : '광고 패키지 문의하기'}
          </Link>
          <Link
            href="/local"
            className="rounded-xl border border-violet-200/70 px-5 py-3 text-sm font-semibold text-violet-100 no-underline transition hover:bg-white/10"
          >
            {isThai ? 'ดูหน้าโลคัลตัวอย่าง' : '로컬 페이지 실제 예시 보기'}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            title: isThai ? '1) สร้างความน่าเชื่อถือ' : '1) 신뢰 기반 노출',
            desc: isThai
              ? 'รีวิวและคอนเทนต์ชุมชนช่วยเพิ่มความเชื่อมั่นก่อนตัดสินใจ'
              : '커뮤니티 후기/정보 문맥 안에서 노출되어 광고 피로감보다 신뢰를 먼저 형성합니다.',
          },
          {
            title: isThai ? '2) เชื่อมต่อออฟไลน์→ออนไลน์' : '2) 오프라인-온라인 전환',
            desc: isThai
              ? 'QR ที่หน้าร้านพาลูกค้าเข้าหน้าร้านออนไลน์ได้ทันที'
              : '카운터 QR로 매장 방문객을 디지털 메뉴/공지/문의 채널로 즉시 전환합니다.',
          },
          {
            title: isThai ? '3) วัดผลและปรับปรุงได้' : '3) 성과 측정과 확장',
            desc: isThai
              ? 'วัดจำนวนคลิก การเข้าชม และช่องทางติดต่อเพื่อขยายแคมเปญ'
              : '유입/클릭/문의 데이터를 기반으로 업종별 캠페인을 단계적으로 확장할 수 있습니다.',
          },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-bold text-emerald-900">
          {isThai ? 'ข้อเสนอเริ่มต้นสำหรับร้านใหม่' : '신규 제휴 매장 시작 오퍼'}
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          {isThai
            ? 'วาง QR ที่หน้าเคาน์เตอร์และลงข้อมูลร้านครบถ้วน รับส่วนลดเดือนแรกฟรี'
            : '카운터 QR 배치 + 미니홈 기본 셋업 완료 시, 첫 1개월 광고비 무료 적용(온보딩 조건 충족 시).'}
        </p>
      </section>
    </main>
  );
}
