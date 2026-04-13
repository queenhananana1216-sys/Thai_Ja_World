# 태자월드 3D 리뉴얼 파동형 롤아웃 맵

## Wave A (홈/글로벌)
- 목적: 브랜드 임팩트 + 검색/가입 전환의 균형 검증
- 주요 파일
  - `app/page.tsx`
  - `app/layout.tsx`
  - `app/_components/HomePageClient.tsx`
  - `app/globals.css`

## Wave B (상점/미니홈)
- 목적: 감성 강화와 커스터마이징 유지의 동시 달성
- 주요 파일
  - `app/shop/[slug]/ShopMinihomeClient.tsx`
  - `app/minihome/_components/MinihomeRoomView.tsx`
  - `app/minihome/page.tsx`
  - `app/globals.css`

## Wave C (커뮤니티/뉴스)
- 목적: 읽기/작성 집중도를 유지한 저자극 깊이감 적용
- 주요 파일
  - `app/community/boards/page.tsx`
  - `app/news/[id]/page.tsx`
  - `app/globals.css`

## 배포 제어 정책
- 기본값은 `Lite/Core` 중심으로 시작한다.
- 각 wave는 KPI 게이트 통과 시 다음 wave를 활성화한다.
- 롤백은 wave 단위로 수행하며 공통 primitive는 유지한다.
