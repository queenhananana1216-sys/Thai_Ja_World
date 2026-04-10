# taeja-auto

태자 월드(`taeja-world`)용 **운영 제어 플레인**: 도메인 풀, Vercel 도메인 연결, 대기(standby) 모드, 헬스·이상 감지 크론.

## 파이프라인 분리 (taeja-world 와 역할 나누기)

- 모노레포 전체 기준: [`docs/PIPELINE_SPLIT.md`](../docs/PIPELINE_SPLIT.md) — **운영(`auto`)** 과 **제품·SEO(`taeja-world`)** 경계·체크리스트.

## 로컬·숨김·강령 (llangkka)

- **강령만 편집**: 루트 [`PIPELINE_CHARTER.md`](./PIPELINE_CHARTER.md) — 코드 없이 지침을 바꿉니다.
- **외부로 안 보냄**: `AUTO_PIPELINE_LOCAL_ONLY=1` 이면 클라우드 AI를 호출하지 않고 규칙 엔진만 사용합니다.
- **선택적 강령 주입**: `AUTO_BRAIN_INCLUDE_CHARTER=1` 일 때만 외부 브레인 프롬프트에 강령 일부 포함(기본 `0`).
- **확장 도구**: [`src/lib/tools/registry.ts`](./src/lib/tools/registry.ts)에 SEO·운영 도구 ID를 등록해, 태자 월드 쪽과 공유할 수 있습니다. 기본: `seo.metaDraft`, `ops.charterExcerpt`.

## 배포

1. Vercel에서 **새 프로젝트**로 이 폴더(`auto/`)만 루트로 연결하거나, 모노레포면 Root Directory를 `auto`로 설정합니다.
2. [`.env.example`](./.env.example) 값을 프로젝트 환경 변수에 복사합니다.
3. `VERCEL_TOKEN`은 최소 권한(프로젝트·Edge Config)으로 발급합니다.
4. 프로덕션에서는 `DATABASE_URL`을 권장합니다. 없으면 서버리스 인스턴스 간 상태가 공유되지 않습니다.

## 로컬

```bash
cd auto
npm install
cp .env.example .env.local
npm run dev
```

- 앱: `http://127.0.0.1:3010`
- 관리: `/admin` (로그인에 `AUTO_ADMIN_SECRET` 사용)

## 태자 월드 연동

- `EDGE_CONFIG` + 키 `site_mode` / `canonical_host`를 태자 월드 `middleware`에서 읽습니다.
- `auto`가 standby 전환 시 Edge Config를 PATCH할 수 있도록 `EDGE_CONFIG_ID`와 `VERCEL_TOKEN` 권한을 맞춥니다.

## 관리자 봇 · Nord VPN 전용 IP · 미디어 업로드

운영 파이프라인에서 **봇이 특정 URL에서 미디어를 받아 온 뒤** 이 앱으로 올리는 경우를 전제로 합니다.

- **네트워크**: 봇은 Nord VPN **전용(고정) IP**로 나가게 두고, 그 IP를 `INGEST_IP_ALLOWLIST`에 넣으면 Vercel에 도달하는 요청을 IP로 한 번 더 걸러 낼 수 있습니다. (Vercel 대시보드 방화벽·레이트 제한과 병행 권장.)
- **SSRF 방지**: `auto` 서버는 사용자가 지정한 URL로 **임의 fetch 하지 않습니다**. 다운로드는 항상 봇 측(Nord 경로)에서 수행하고, 서버는 **업로드된 바이트만** 받습니다.
- **출처 감사**: 선택적으로 `X-Ingest-Source-Url: https://…` 헤더를 붙이면 감사 로그에 남깁니다. `INGEST_ALLOWED_SOURCE_HOSTS`를 설정하면 허용된 호스트만 통과합니다.
- **내용 방어**: `INGEST_MAX_BYTES`, `INGEST_ALLOWED_MIME`으로 크기·MIME 화이트리스트. 필요하면 Vercel WAF·별도 스캐너를 후단에 두세요.
- **엔드포인트**: `POST /api/bot/ingest` — `multipart/form-data` 필드 `file` 또는 원시 바디 + `Content-Type`. `Authorization: Bearer INGEST_BOT_SECRET` 필수.
- **저장**: `BLOB_READ_WRITE_TOKEN`이 있으면 Vercel Blob `bot-ingest/…` 에 저장합니다. 없으면 수신·감사 로그만 남깁니다.

## AI 두뇌 (도메인·이상 대응)

- `AI_GATEWAY_API_KEY` + `AUTO_BRAIN_MODEL`(기본 `openai/gpt-4o`)으로 헬스 HEAD·도메인 풀만 넣어 **구조화된** 권고를 받습니다. 외부 트래픽 로그는 없으므로 프롬프트도 그 전제입니다.
- 규칙 엔진(연속 실패 임계값)과 **OR**로 묶입니다: 모델이 `critical` 또는 `enter_standby_prepare_failover`(신뢰도≥`AUTO_BRAIN_MIN_CONFIDENCE`)면 사전에 standby 할 수 있습니다.
- `return_to_normal`은 HEAD가 정상일 때 standby 해제 후보로만 쓰입니다.

## 온체인 자동결제

- `AUTO_PAY_ENABLED=1` 이고 `AUTO_PAY_SIGNER_PRIVATE_KEY`, `AUTO_PAY_RECIPIENT`, `AUTO_PAY_RPC_URL`, `AUTO_PAY_AMOUNT_WEI` 가 있으면, **파이프라인에서 standby 진입 또는 도메인 승격이 발생한 크론 틱**에 운영 지갑에서 수취 주소로 네이티브 토큰을 보냅니다(쿨다운 `AUTO_PAY_COOLDOWN_MS`).
- **사용자 지갑에서 자동으로 빠져나가게** 하려면 ERC20 `approve` + 결제 컨트랙트 또는 EIP-4337 등 별도 설계가 필요합니다. 이 저장소는 **운영 핫 지갑 송신**만 포함합니다.
- 관리 UI의 “등록 지갑”은 표시·감사용이며, 실제 송금과는 분리됩니다.
