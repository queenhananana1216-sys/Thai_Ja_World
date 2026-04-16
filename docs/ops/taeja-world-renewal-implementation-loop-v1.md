# 태자월드 리뉴얼 적용 루프 v1

## Step A. 요구 재정리

- 목표: 홈 랜딩을 "3D 인터랙티브 브랜딩 + 명확한 전환 CTA" 구조로 재편
- 핵심 구간: `Hero -> Problem -> Core Services -> Testimonials -> Footer CTA`
- 고정 제약:
  - 기능/DB/API 변경 금지
  - 접근성/성능 기준은 `3d-renewal-governance.md` 우선
  - 과자극 금지(CTA 경쟁 시선 최소화)

## Step B. 1차 구현 배치(적용 단위)

- 대상 파일:
  - `Thai_Ja_World/app/_components/HomePageClient.tsx`
  - `Thai_Ja_World/app/globals.css`
- 1차 적용 항목:
  1) Hero 정보 위계 재정렬(헤드라인, 서브텍스트, 1차 CTA, 2차 CTA)
  2) Problem 3-card 구간 추가(글래스 카드 + 핵심 불편 3개)
  3) Core Services 5-step 여정 섹션 추가(스크롤 반응형 레이어)
  4) Testimonials 섹션 추가(아바타/말풍선 형태)
  5) Footer grand CTA + QR placeholder 영역 추가
  6) `prefers-reduced-motion` 스타일 가드 추가

## Step C. Self-Reflection (오류/리스크 점검)

- 구조 점검:
  - 기존 데이터 fetch 흐름(뉴스/가게/채팅/환율)과 충돌 없는지 확인 필요
  - 신규 섹션이 기존 포털/커뮤니티 블록과 중복 메시지를 만들 가능성 존재
- 성능 점검:
  - Hero + Core Services에 모션이 동시에 많아질 경우 과자극 리스크
  - 모바일에서 레이어 수가 많으면 LCP/Long Task 악화 가능성
- 접근성 점검:
  - 장식용 3D 요소 `aria-hidden` 필수
  - 키보드 탐색 순서가 CTA 우선 흐름을 깨지 않는지 확인 필요

## Step D. 차이 보고(요청 대비)

- 반영됨:
  - Must/Prefer/Out 기준이 문서로 확정됨
  - 구현 대상 파일과 1차 배치 단위가 확정됨
  - Self-Reflection 항목(구조/성능/접근성) 점검표 고정
- 보류됨:
  - 실제 코드 변경은 다음 배치에서 실행
  - 성능 계측(LCP/CLS/Long Task)은 구현 후 실측 필요
- 추가확인 필요:
  - Hero 메인 카피 최종 문구
  - Footer CTA 문구와 QR 실제 목적지 URL

## Step E. 2차 미세조정 계획

- 카피 보정: Hero, Problem, Footer 문구 톤 통일
- 시각 보정: 카드 blur 강도, stroke 불투명도, CTA 대비값 미세 조정
- 반응형 보정: Mobile에서 Core Services를 카드 스냅 방식으로 단순화
- 접근성 보정: reduced-motion 강제 시 모션 제거 + 상태전이만 유지

## 바로 실행 가능한 운영 규칙

- 구현 턴마다 아래 순서를 고정:
  1) 변경 범위 선언
  2) 코드 적용
  3) Self-Reflection 체크(구조/성능/접근성)
  4) 반영/보류/확인필요 보고
  5) 2차 미세조정 반영
