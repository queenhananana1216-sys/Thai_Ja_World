# 태자월드 3D 접근성/성능 가드레일

## 접근성
- `prefers-reduced-motion: reduce` 감지 시 모션/전환/깊이 효과를 비활성화한다.
- 모든 주요 CTA는 키보드(Tab + Enter/Space)만으로 도달/실행 가능해야 한다.
- 대비 기준은 WCAG AA(일반 텍스트 4.5:1 이상)를 유지한다.
- 포커스 링은 배경/글래스 효과 위에서도 시인성을 유지한다.

## 디바이스 등급별 강등 정책
- 기본 티어는 surface별 기본값을 따른다.
- 저사양 조건(`deviceMemory <= 4`, `hardwareConcurrency <= 4`, coarse pointer)에서는 `core` 이상을 제한한다.
- `reduced-motion` 환경에서는 무조건 `lite`로 강등한다.

## 렌더링 예산
- 첫 화면 동시 애니메이션 요소: 3개 이하
- surface당 배경 레이어: 3개 이하
- 초기 JS(gzip): 220KB 이하 목표
- 첫 10초 Long Task: 12개 이하

## 운영 룰
- 가드레일 위반 시 wave 확장 중지
- KPI 급락 + 성능 악화 동시 발생 시 즉시 롤백
- 실험군에서도 접근성 가드레일은 예외 없이 적용
