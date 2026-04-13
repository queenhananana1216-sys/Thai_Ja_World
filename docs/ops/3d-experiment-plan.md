# 태자월드 3D A/B 실험 계획

## 실험 키
- `home_3d_renewal_v1`

## 실험군
- `control`: 기존 UI
- `lite_core`: Lite/Core 중심 3D
- `core_immersive`: Core/Immersive 확장 3D

## KPI
- 비즈니스
  - 히어로 CTA 클릭률
  - 게스트 탐색 시작률
  - 주간 재방문률
- UX/성능
  - 첫 검색 시작 시간
  - 스크롤 도달률 p75
  - 모바일 LCP p75
  - dead click 비율

## 검증 주기
- 2주 단위로 검증
- 각 wave는 이전 wave KPI 통과 후 확장

## 롤백 기준
- 히어로 CTA 클릭률 8%p 이상 하락
- 모바일 LCP 20% 이상 악화
- 이탈률 8%p 이상 상승
- 접근성 치명 이슈 발생

## 구현 메모
- 런타임에서 `data-tj3d-variant`와 `data-tj-tier`를 html dataset에 기록
- UX 이벤트(`page_view`, `click`, `dead_click`, `js_error`)에 variant/tier를 meta로 포함
