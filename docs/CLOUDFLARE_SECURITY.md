# Cloudflare로 도메인 · WAF · Access · Workers (태자 월드 / auto)

Vercel에 올린 앱(`taeja-world`, `taeja-auto`) 앞단에 Cloudflare를 두고 **도메인·WAF·접근 통제·엣지 로직**을 쌓는 순서입니다.

## 1. 도메인·DNS (프록시 켜기)

1. Cloudflare에 도메인 추가(네임서버를 Cloudflare로 변경).
2. **프록시 상태**: A/CNAME 레코드에 **주황 구름(Proxied)** 켜기.
3. Vercel 쪽:
   - Vercel 프로젝트에 **동일 호스트**(예: `www`, `@`)를 커스텀 도메인으로 추가.
   - DNS는 Cloudflare에서 Vercel로 향하게:
     - 권장: [Vercel 문서](https://vercel.com/docs/projects/domains)에 맞는 CNAME/A.
     - 예: `www` → `cname.vercel-dns.com` 또는 Vercel이 안내하는 값.
4. **SSL/TLS** (Cloudflare): 대개 **Full (strict)** — Vercel이 발급한 인증서와 맞물리게.

이렇게 하면 트래픽 경로가 `사용자 → Cloudflare 엣지 → Vercel(원본)` 이 됩니다.

## 2. WAF · 트래픽 통제

**Security → WAF**

- **Managed Rulesets** (OWASP, Cloudflare Managed): 기본 ON 후 로그로 오탐 조정.
- **Custom rules** (표현식):
  - 예: 경로 `/api/` 에 대해 의심 국가·ASN 차단은 신중히(실사용자 오탐).
  - 관리자·내부 API는 **IP allowlist** 또는 아래 **Access** 권장.
- **Rate limiting** (별도 유료 플랜 요소 있음):
  - 예: `POST /api/bot/*` 초당·분당 요청 제한.
  - `auto`의 봇 업로드·크론은 **시크릿 헤더 + 소스 IP**와 함께 설계(이미 `INGEST_*`).

**Bots**

- **Bot Fight Mode** / **Super Bot Fight**: 봇·스크래핑 완화(플랜별). 오탐 시 쿠키 챌린지 완화.

**Turnstile**

- 레포에 이미 Turnstile 검증 코드가 있음(`verify-turnstile`). 폼·로그인 보조에 활용.

## 3. Cloudflare Access (Zero Trust) — 사람·관리자 보호

**Zero Trust → Access → Applications**

- **Application name**: 예 `Taeja Admin`.
- **Application domain**: 예 `www.thaijaworld.com` (또는 admin 전용 서브도메인).
- **Path**: `/admin`, `/api/cron/*` 등 **최소 범위**로 쪼개는 것을 권장.
  - `/api/cron/*`는 Vercel Cron이 **공개 URL로 호출**하므로, Access로 막으면 **Cron이 실패**합니다.  
  - 대안: Cron 전용 경로는 Access 제외 + **강한 `CRON_SECRET`** 또는 [Cloudflare Tunnel / mTLS](https://developers.cloudflare.com/cloudflare-one/) 등 별도 설계.
- **Policy**: 허용할 이메일 도메인, GitHub 조직, 일회용 OTP 등.

**요약**: 관리자 UI·민감 API는 Access로; **크론·웹훅**은 시크릿·IP 제한·별도 호스트로 분리.

## 4. Workers (엣지에서 한 번 더)

역할 예시:

- 응답에 **보안 헤더** 일괄 추가(일부는 Transform Rules로도 가능).
- 특정 경로만 **JWT·HMAC 검증** 후 원본으로 전달.
- **Rate limit**을 KV/Durable Objects와 조합(구현 난이도↑).

**주의**: Worker를 **역프록시**로 쓰려면 DNS·라우트를 Worker로 묶고 `fetch`로 Vercel 호스트로 넘기는 별도 설계가 필요합니다. 단순 배포는 **DNS 프록시 + WAF + Access**만으로도 충분한 경우가 많습니다.

레포에 선택용 스텁: [`cloudflare/workers/edge-guard`](../cloudflare/workers/edge-guard).

## 5. 권장 적용 순서

1. DNS 프록시 + SSL Full (strict) + Vercel 커스텀 도메인 정상화.
2. WAF Managed Rules ON → 로그 확인.
3. Rate limiting(민감 API부터).
4. Access로 `/admin` 등 사람용 경로 보호.
5. 필요 시 Worker 또는 Transform Rules로 헤더·세부 라우팅.

## 6. auto 파이프라인과의 관계

- `auto`의 도메인 API·헬스 크론은 **Vercel 쪽**에서 동작; Cloudflare는 **사용자·공격 트래픽이 앱에 닿기 전**에 걸러 줍니다.
- **운영 시크릿**은 Vercel 환경 변수 + Cloudflare에 노출 최소화; Access 정책과 중복되지 않게 경로 설계.
