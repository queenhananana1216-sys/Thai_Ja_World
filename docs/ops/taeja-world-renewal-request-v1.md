# 태자월드 리뉴얼 요청서 v1

## 프로젝트

- 이름: Taeja World
- 목표: 한국인을 위한 태국 정착 서비스 랜딩 페이지를 3D 인터랙티브 중심으로 리뉴얼
- 기준 레퍼런스:
  - 노션 프로토타입(사용자 제공)
  - `Thai_Ja_World/docs/ops/3d-renewal-governance.md`
  - `Thai_Ja_World/app/_components/HomePageClient.tsx`

## 이번 작업 범위

- 수정 대상(in-scope):
  - 홈 랜딩의 핵심 내러티브 5개 구간
    1) Hero
    2) Problem
    3) Core Services
    4) Testimonials
    5) Footer CTA
  - 위 5개 구간의 카피, 정보 위계, CTA 배치, 인터랙션 강도
- 제외 대상(out-of-scope):
  - 로그인/회원가입/게시판/미니홈 등 백엔드 연동 기능 변경
  - 관리자 화면, DB 스키마, API 계약 변경
  - 다국어 카피 재번역(문구 길이 보정만 허용)

## 디자인 요구사항

- Must:
  1) Hero에 3D 씬(패스포트/집/병원/채팅 아이콘 플로팅) + 메인 CTA를 최우선 시선으로 배치
  2) Problem 섹션에 3개의 글래스모피즘 카드와 핵심 페인포인트 텍스트 구조 적용
  3) Core Services를 스크롤 기반 3D 여정(5개 장면)으로 설계
  4) Testimonials는 아바타 + 말풍선 구조로 신뢰도 중심 배치
  5) Footer에 대형 CTA와 QR placeholder 영역 제공
  6) 과도한 모션을 제한하고 `prefers-reduced-motion` 대응(거버넌스 기준 준수)
- Prefer:
  1) Hero와 Core Services에 동일한 3D 어휘(빛, 깊이, 레이어)를 공유
  2) CTA hover/press는 동일한 피드백 패턴으로 통일
  3) 모바일에서는 3D 복잡도를 단계적으로 축소
- Out:
  1) 배경 비디오 자동재생
  2) CTA와 경쟁하는 고강도 애니메이션
  3) 섹션별 개별 디자인 언어 남용(톤 불일치)

## 스타일 가이드

- 톤/무드: 신뢰감, 미래지향, 프리미엄, 친절함
- 컬러:
  - Light background: `#F6F8FC`
  - Primary blue 계열: `#0B2A6A` ~ `#0B3B9A`
  - Accent orange: `#FF9A2F`
  - Glass stroke: `rgba(11, 42, 106, 0.18)`
- 타이포:
  - 제목: 강한 대비의 굵은 산세리프
  - 본문: 가독성 우선의 중간 굵기 산세리프
- 모션:
  - 기본: low-to-medium 강도
  - Hero는 진입 모션 1회 + 인터랙션 반응형 모션
  - Core Services는 스크롤 연동, 과가속/과진동 금지

## 반응형/접근성

- 브레이크포인트:
  - Mobile: 360~767
  - Tablet: 768~1199
  - Desktop: 1200+
- 접근성:
  - 텍스트/배경 대비 WCAG AA 이상
  - 키보드 포커스 링 명시
  - 장식성 3D 요소는 `aria-hidden` 처리
  - `prefers-reduced-motion: reduce` 시 모션 축소/정지

## 산출물

- 1차 산출물:
  - 홈 랜딩 리뉴얼 반영 코드
  - 변경 요약 문서(적용/보류/확인필요)
- 완료 기준:
  - Must 항목 100% 충족
  - Mobile(375px) / Desktop(1440px)에서 레이아웃 안정
  - 거버넌스 기준의 과자극/성능/접근성 가드레일 위반 없음

## 검수 방법

- 비교 기준:
  1) 정보 위계(헤드라인 -> 설명 -> CTA) 일치 여부
  2) 레퍼런스 대비 섹션 구조/시선 흐름 일치 여부
  3) 색상/간격/카드 스타일 일관성
- 피드백 우선순위 표기:
  - 높음: 전환/이탈에 직접 영향
  - 중간: 시각 완성도/브랜딩 영향
  - 낮음: 미세 간격/카피 톤 보정
