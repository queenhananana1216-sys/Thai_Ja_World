---
name: taeja-validate-workflow
description: Runs taeja-world npm scripts (type-check, lint, optional build). Use only when package.json name is taeja-world and the user asks 검증·PR 전·마이그레이션 후 확인. For other repos use any-project-quick-validate.
---

# taeja-world 검증 워크플로

## 전제

- 작업 디렉터리: 프로젝트 루트 (`package.json`에 `"name": "taeja-world"`).
- PowerShell 기준. 시크릿은 출력에 넣지 않는다.

## 필수 (코드 변경 후)

1. 타입체크: `npm run type-check`
2. 린트: `npm run lint`

실패 시: 첫 에러 파일부터 원인(타입·import·React 훅 규칙)을 고치고 다시 실행한다.

## 권장 (배포 전·대형 리팩터)

3. 프로덕션 빌드: `npm run build`  
   - 환경 변수가 없어 실패할 수 있음. 그 경우 사용자에게 로컬 `.env.local` 또는 CI 시크릿 필요 여부를 짧게 안내한다.

## DB 마이그레이션을 건드린 경우

4. 로컬 Supabase CLI가 있으면: `supabase db reset` 또는 새 마이그레이션만 `supabase migration up` 등 **사용자가 쓰는 방식**에 맞춰 적용 후, 영향 받는 API·RLS를 수동 스모크한다.
5. 에이전트는 원칙적으로 **원격 DB에 destructive 명령을 실행하지 않는다**. 검증은 로컬 또는 사용자가 명시한 환경만.

## 출력 형식

- 각 명령의 exit code와 한 줄 요약(성공/실패).
- 실패 시: 로그에서 **파일:줄**과 수정 방향만 제시; 시크릿·전체 `.env` 덤프는 금지.
