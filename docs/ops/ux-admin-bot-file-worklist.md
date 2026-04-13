# TaejaWorld 관리자봇 UX 자동개선 구현 작업 리스트

## 목표
- 24시간 동선/클릭 데이터 수집
- 5분 주기 관리자봇이 지표 분석
- 안전한 UI 플래그 방식으로 자동 조정

## 파일 단위 작업 리스트

### 1) UX 수집 파이프라인
- [x] `supabase/migrations/078_ux_tracking_and_flags.sql`
  - `ux_events`, `ux_metrics_5m`, `ux_flag_overrides` 테이블 생성
  - 공개 읽기 가능한 플래그 정책 추가
- [x] `src/lib/ux/types.ts`
  - 공통 이벤트/플래그 타입 정의
- [x] `app/api/ux/track/route.ts`
  - 배치 이벤트 수집 API 구현
- [x] `app/_components/GlobalUxTracker.tsx`
  - 전역 페이지뷰/클릭/dead-click/JS 오류 자동 수집
- [x] `app/_components/Providers.tsx`
  - 전역 트래커 주입

### 2) 관리자봇 분석 루프
- [x] `src/bots/orchestrator/runUxOptimizationLoop.ts`
  - 최근 N분 이벤트 집계
  - dead-click/QR 전환 지표 기반 플래그 산출
  - `bot_actions` 로그 연동
- [x] `app/api/cron/ux-bot/route.ts`
  - cron 호출 엔드포인트 구현
- [x] `vercel.json`
  - `/api/cron/ux-bot` 5분 스케줄 추가

### 3) 플래그 적용 경로
- [x] `src/lib/ux/flagsServer.ts`
  - 서버에서 활성 플래그 로딩 유틸
- [x] `app/api/public/ux-flags/route.ts`
  - 공개 플래그 조회 API
- [x] `app/local/page.tsx`
  - `local.qr_emphasis` 플래그 반영 (QR CTA 강조)
- [x] `app/layout.tsx`
  - `nav.member_notes_label` 플래그 반영 훅(ko/th)

## 검증 체크
- [x] `npm run type-check` 통과
- [x] `/api/ux/track` 샘플 이벤트 적재 성공
- [x] `/api/cron/ux-bot` 실행 성공
- [x] `/api/public/ux-flags` 플래그 조회 성공

