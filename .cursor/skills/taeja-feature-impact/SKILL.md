---
name: taeja-feature-impact
description: Maps taeja-world-only features (minihome, shop, community, bots) to files and SQL. Use only in the taeja-world repo when the user asks 영향 범위·연쇄 수정. Not for unrelated SSD projects.
---

# 기능 영향 맵 (taeja-world)

에이전트는 변경 요청을 받으면 아래 표에서 **해당 축**을 전부 훑고, grep/검색으로 실제 심볼을 확인한다.

## 축 → 점검 위치

| 축 | UI | 서버/API | DB·정책 |
|----|-----|----------|---------|
| 로그인·세션 | `middleware.ts`, `app/auth/` | Supabase SSR 쿠키 | Auth 트리거·프로필 (`031_*`, `034_*` 등) |
| 미니홈 공개/편집 | `app/minihome/`, `middleware.ts` `pathRequiresAuth` | — | `005_*`, `029_*`, `038_*`, `051_*` 근처 |
| 샵·게스트북 | `app/shop/`, `app/my-local-shop/` | shop·guestbook API | `052_*`, `054_*`, local spots 마이그레이션 |
| 일촌 | 미니홈·샵 컴포넌트 | RPC/API 이름 검색 | `037_*`, `038_*` |
| 커뮤니티·꿀팁 | `app/community/`, `app/tips` | `app/api/community/`, moderation | `046_*`, `050_*`, `003_*` |
| 뉴스 | `app/news/`, admin news | `app/api/bot/process-news` 등 | `007_*`, `009_*` |
| 지식 파이프라인 | `app/admin/knowledge` | `app/api/bot/knowledge-*`, `src/bots/` | `011_*`, `012_*`, `023_*`, `026_*`, `039-*` |
| 푸시 | — | `src/lib/push/` | `008_*` |
| 관리자 | `app/admin/` | `resolveAdminAccess`, `src/lib/admin/` | `006_*`, `010_*` |
| 크론·봇 보안 | — | `cronAuth.ts`, 각 `route.ts` | 환경 변수 이름 통일 |

## 작업 방식

1. 사용자 요청을 위 표의 **한 축 이상**에 매핑한다.
2. `rg` 또는 IDE 검색으로 테이블명·RPC·환경 변수명을 찾아 **마이그레이션 번호**와 **TS 파일**을 연결한다.
3. UI 문자열이면 `src/i18n/dictionaries.ts` 등 i18n 유무를 확인한다.
4. 끝에 **빠질 수 있는 한 가지**(예: 미들웨어 예외, RLS, 크론 헤더)를 짚어 제안한다.

## 확장(새 기능) 시

- 새 라우트: `middleware.ts` 보호 여부 + `src/lib/search/siteSearchEntries.ts` 등 사이트맵/검색 노출 정책.
- 새 테이블: `supabase/migrations/` 신규 파일 + RLS + 앱의 Supabase 쿼리 계층.
