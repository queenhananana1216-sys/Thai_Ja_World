# 태자월드(taeja-world) 콘텐츠·로컬 파이프라인 점검

프로덕션이 “비어 보이는” 경우는 **코드 버그가 아니라** 아래가 비어 있거나(데이터) **크론/ENV가 꺼져** 있을 때가 많습니다. 배포·운영 시 순서대로 확인하세요.

## 1) 공개 HTTP 스모크

- 페이지: `BASE_URL` 기준 `npx tsx scripts/smoke-public-routes.ts`
- 루트에 `npm run` 스크립트: `smoke:routes` (package.json) — 동일 스크립트를 호출하는 항목이 있으면 그것을 사용

추가로 `GET /api/weather` 는 Open-Meteo에 의존; **502** 이면 업스트림(네트워크·쿼터) 가능성. 앱 쪽 Open-Meteo URL은 `src/lib/weather/openMeteoThailand.ts` 의 `OPEN_METEO_THAILAND_URL` 과 일치.

## 2) Supabase 데이터(요약)

| 흐름            | 주요 테이블 / 조건                 | 앱·크론 참고                    |
| --------------- | ---------------------------------- | ------------------------------- |
| 뉴스·펄스       | `processed_news` · `published=true` | `news:ingest`, `api/cron/news`  |
| 꿀팁/광장 글   | `posts` · 카테고리/지식팁          | `knowledge:ingest`, community API |
| 로컬 가게      | `local_spots` · `is_published=true` | `ops:check-local-minihome`, `local-shop-template:pipeline` |
| 랜딩 히어로     | `local_spots` count (서비스롤)      | `fetchLandingStatsSSR`         |

빈 목록이면 **RLS**로 익명 `select` 가 막혔는지, 또는 **시드/게시**가 없는지 Supabase 콘솔에서 확인합니다.

## 3) Vercel 크론

- `vercel.json` 의 `path` (예: `local-shop-template` 등) 가 프로젝트에 붙어 있고, `CRON_SECRET` / `BOT_CRON_SECRET` 이 배포 env에 있는지 확인합니다. 로컬에선 `src/lib/cronAuth.ts` 가 비밀이 없을 때 검증을 생략할 수 있습니다.

## 4) npm 스크립트(루트 package.json)

- `pipeline:content-ui` — 뉴스·지식·홈카피 일괄
- `ops:check-local-minihome` — 로컬 미니홈 점검
- `verify:prod` / `smoke:prod` — 환경에 맞을 때
