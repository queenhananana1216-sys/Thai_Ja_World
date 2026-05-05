import 'server-only';

export type BizProposalKind =
  | 'address'
  | 'phone'
  | 'name'
  | 'coordinates'
  | 'operational_status'
  | 'place_not_found'
  | 'google_place_id';

export function wittyBizProposalCopy(
  kind: BizProposalKind,
  businessName: string,
): { headline: string; sub: string } {
  const n = businessName.trim() || '이 업체';
  switch (kind) {
    case 'address':
      return {
        headline: '주소가 살짝 엇나갔나 봐요',
        sub: `${n} — 구글 지도가 우리 DB보다 한 걸음 앞서 있네요. 오너님, 지도 핀 다시 박을까요?`,
      };
    case 'phone':
      return {
        headline: '전화번호가 통신사처럼 바뀌었대요',
        sub: `${n} — 번호 한 자리라도 다르면 교민님들이 헛탕 칩니다. 승인만 누르면 바로 갱신.`,
      };
    case 'name':
      return {
        headline: '간판 이름이 리브랜딩된 듯',
        sub: `${n} — Places가 부르는 이름과 우리 DB가 달라요. 동일 업소 맞는지 눈으로만 한번 확인해 주세요.`,
      };
    case 'coordinates':
      return {
        headline: '핀이 옆 동네로 이사 갔어요',
        sub: `${n} — 위·경도가 미세하게 어긋났습니다. 내비·지도 링크 품질을 위해 좌표를 맞출까요?`,
      };
    case 'operational_status':
      return {
        headline: '영업 신호등이 바뀌었습니다',
        sub: `${n} — 구글 기준 영업 상태가 달라졌어요. 폐업·휴업이면 빨리 반영하는 게 신뢰도 방어입니다.`,
      };
    case 'place_not_found':
      return {
        headline: '구글 지도에서 증발…?',
        sub: `${n} — Place ID가 더 이상 조회되지 않아요. 폐업·통합·ID 변경 중 하나일 수 있습니다. 신중 승인 부탁.`,
      };
    case 'google_place_id':
      return {
        headline: 'Place ID가 정규화됐습니다',
        sub: `${n} — 구글 리소스 ID가 갱신됐습니다. 중복 행과 붙이지 않는 한 안전하게 따라가도 됩니다.`,
      };
    default:
      return {
        headline: '데이터 불일치 감지',
        sub: `${n} — 자동 감사가 수정 후보를 들고 왔습니다.`,
      };
  }
}
