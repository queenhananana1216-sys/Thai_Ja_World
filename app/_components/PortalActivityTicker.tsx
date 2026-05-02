'use client';

import styles from './PortalActivityTicker.module.css';

const LINES_KO = [
  '방금 [익명]님이 새로운 꿀팁을 등록했습니다! +50 도토리',
  '누군가 [파타야 렌트카] 글에 공감했습니다!',
  '[방콕 맛집] 후기에 댓글이 달렸어요 — 커뮤니티가 숨쉬는 중',
  '실시간: [치앙마이 비자런] Q&A에 답변이 올라왔습니다',
  '누군가 번개장터에서 거래 메시지를 보냈습니다',
  '주간 미션 클리어! 누군가 +120 도토리를 획득했습니다',
  '[익명]님이 로컬 업체 리뷰를 남겼습니다 ★★★★☆',
  '지금 이 순간에도 새 글이 올라오고 있어요',
  '한인 생활망에서 마트 할인 정보가 공유됐습니다',
  '누군가 [교통/운전] 팁에 북마크를 눌렀습니다',
] as const;

const LINES_TH = [
  'เพิ่งมีคนโพสต์ทิปใหม่! +50 ดอกท้อ',
  'มีคนกดถูกใจโพสต์ [เช่ารถพัทยา]!',
  'ชุมชนกำลังเคลื่อนไหว — ความคิดเห็นใหม่ใน [ร้านกรุงเทพ]',
  'มีคนตอบ Q&A [วีซ่าเชียงใหม่]',
  'ตลาดมือสอง: มีข้อความใหม่',
  'ภารกิจรายสัปดาห์สำเร็จ! +120 ดอกท้อ',
  'มีรีวิวร้านท้องถิ่นใหม่ ★★★★☆',
  'โพสต์ใหม่กำลังขึ้นเรื่อย ๆ',
] as const;

function buildTickerText(locale: 'ko' | 'th'): string {
  const pool = locale === 'th' ? LINES_TH : LINES_KO;
  return pool.join('   •   ');
}

/**
 * 모바일 전용 — 하단 탭 바 직상단 고정 마키. `locale`은 루트 레이아웃 `html lang`과 동기.
 */
export default function PortalActivityTicker({ locale }: { locale: 'ko' | 'th' }) {
  const loc = locale === 'th' ? 'th' : 'ko';
  const text = buildTickerText(loc);

  return (
    <div
      className={`${styles.root} fixed inset-x-0 z-[45] md:hidden`}
      style={{
        bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-hidden
    >
      <div className={styles.track}>
        <span className={styles.inner}>
          <span className={styles.dot}>● LIVE</span> {text}
        </span>
        <span className={styles.inner} aria-hidden>
          <span className={styles.dot}>● LIVE</span> {text}
        </span>
      </div>
    </div>
  );
}
