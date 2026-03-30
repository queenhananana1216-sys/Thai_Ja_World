import OwnerComingSoon from '../../_components/OwnerComingSoon';

export default function OwnerAnnouncementsPage() {
  return (
    <OwnerComingSoon title="공지 쓰기">
      <p style={{ margin: '0 0 10px' }}>
        가게 공지·오늘의 소진·특별 메뉴 알림 등을 회원에게 보내는 기능은{' '}
        <strong>전용 테이블·알림 파이프</strong>와 연결해 단계적으로 넣을 예정입니다. (기존 <code>shop_announcements</code>는{' '}
        <code>local_businesses</code> 기준이라 로컬 스팟 미니홈과는 별도입니다.)
      </p>
      <p style={{ margin: 0 }}>긴급 안내는 운영진에 요청해 주세요.</p>
    </OwnerComingSoon>
  );
}
