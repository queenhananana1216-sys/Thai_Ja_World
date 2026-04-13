# 태자월드 3D 리뉴얼 거버넌스 기준

## 목적
- 3D 효과를 "보여주기"가 아니라 "문제 해결"에 종속시킨다.
- 충동성(과자극), 확장성(유지보수), 성능/접근성을 같은 무게로 평가한다.

## 섹션별 UX 목적 매핑
- `HERO`: 핵심 메시지 인지 + 가입/탐색 CTA 진입
- `PROBLEM`: 공감 형성 및 서비스 필요성 명확화
- `SERVICE`: 기능 이해와 탐색 시작
- `CTA`: 불안 해소 후 가입 전환

## 통합 지표와 통과 기준

### 1) 충동성/과자극 리스크
- `heroConcurrentMotionCount`: 첫 화면 동시 모션 요소 수
  - 권장: 3개 이하
  - 경고: 4~5개
  - 실패: 6개 이상
- `autoPlayMediaCount`: 사용자 상호작용 이전 자동 재생 요소 수
  - 권장: 0개
  - 실패: 1개 이상
- `visualFocusCompeteCount`: CTA 외 경쟁 시선 포인트 수(동일 레벨 강조)
  - 권장: 2개 이하
  - 실패: 3개 이상

### 2) 목적 이탈 리스크
- `timeToFirstSearchStart`: 홈 진입 후 첫 검색/탐색 행동까지 시간
  - 기준선 대비 10% 이내 증가 허용
- `heroCtaClickThroughRate`: 히어로 CTA 클릭률
  - 기준선 대비 하락 5%p 초과 시 실패
- `aboveFoldBounceRate`: 첫 화면 이탈률
  - 기준선 대비 상승 8%p 초과 시 실패

### 3) 확장성/운영성
- `tokenReuseRatio`: 신규 스타일 중 토큰 재사용 비율
  - 목표: 80% 이상
- `sharedPrimitiveAdoptionRatio`: 신규 UI 중 공통 primitive 사용 비율
  - 목표: 70% 이상
- `surfaceCustomCssDelta`: surface별 커스텀 CSS 증가량
  - 목표: 릴리즈 단위 15% 이내

### 4) 성능/접근성
- `lcpMsMobileP75`: 모바일 LCP p75
  - 목표: 2500ms 이하
- `clsP75`: CLS p75
  - 목표: 0.1 이하
- `longTaskCount`: 첫 10초 Long Task 개수
  - 목표: 기존 대비 증가 20% 이내
- `reducedMotionCoverage`: reduced-motion 대응 컴포넌트 비율
  - 목표: 100%

## 의사결정 규칙
- 배포 웨이브 확장 조건:
  - 충동성/목적 이탈/성능/접근성 항목에서 실패 없음
  - 확장성 지표 2개 이상 목표 달성
- 롤백 조건(즉시):
  - 모바일 LCP 급등(기준선 대비 20% 초과)
  - CTA 클릭률 급락(기준선 대비 8%p 초과 하락)
  - 접근성 치명 이슈(키보드 탐색 불가, 대비 기준 미달) 발생
