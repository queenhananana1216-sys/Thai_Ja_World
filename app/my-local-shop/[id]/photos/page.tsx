import OwnerComingSoon from '../../_components/OwnerComingSoon';

export default function OwnerPhotosPage() {
  return (
    <OwnerComingSoon title="사진 업로드">
      <p style={{ margin: '0 0 10px' }}>
        대표 갤러리(<code>photo_urls</code>)는 보안 정책상 <strong>현재 관리자만</strong> 수정할 수 있습니다. 오너 계정은 스토리지에 직접
        올리더라도 가게 행의 URL 목록과 자동 연결되지 않습니다.
      </p>
      <p style={{ margin: 0 }}>사진 반영·메뉴 항목 이미지 URL은 운영진에 요청하거나, 메뉴 JSON의 <code>image_url</code> 필드로 개별 지정할 수 있습니다.</p>
    </OwnerComingSoon>
  );
}
