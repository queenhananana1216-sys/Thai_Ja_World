# llangkka 파이프라인 분리 (운영 vs 제품·SEO)

실수로 인한 **전체 서비스 영향**과 **색인·콘텐츠만의 영향**을 나누기 위한 계약입니다.

## 두 개의 평면

| 평면 | 코드 위치 | 하는 일 | 잘못 쐈을 때 |
|------|-----------|---------|--------------|
| **A · 운영 제어** | [`auto/`](../auto/) (`taeja-auto`) | 도메인 페일오버, 헬스·크론, 봇 인제스트, Edge Config 동기화, (선택) 온체인 송금, Cloudflare는 [별도 문서](./CLOUDFLARE_SECURITY.md) | **전역 가용성·DNS·비용** |
| **B · 제품·SEO·콘텐츠** | [`app/`](../app/), [`src/`](../src/) (`taeja-world`) | 페이지·뉴스·지식·커뮤니티, 메타·사이트맵·canonical, (향후) 키워드·초안·발행 큐 | 주로 **색인·문구·특정 라우트** |

**원칙**: A에서 SEO 본문을 대량 생성·발행하지 않는다. B에서 Vercel 프로젝트 도메인 API를 직접 부르지 않는다(필요하면 A의 API·자동화만 경유).

## 연결 방식 (얇게)

- **환경 변수**: A는 `VERCEL_TOKEN`, `TAEJA_VERCEL_PROJECT_ID`, `CRON_SECRET`, `INGEST_*` 등. B는 `NEXT_PUBLIC_*`, Supabase, SEO 헬퍼. **교차 복사 금지** — 필요한 키만 각 배포에.
- **이벤트**: 장기적으로는 “발행됨”“도메인 전환됨”을 큐/감사 로그로만 연동. 당장은 **수동·크론 분리**로 충분.
- **도구 ID**: [`auto` 레지스트리](../auto/src/lib/tools/registry.ts)의 `seo.*` 스텁은 **B 쪽 구현과 타입만 맞추고**, 배포 단위는 분리.

## 변경 시 체크리스트

**A만 바꿀 때**

- [ ] `TAEJA_PUBLIC_URL`·도메인 풀이 프로덕션과 일치하는지
- [ ] 크론·인제스트 경로가 Cloudflare Access에 막히지 않았는지
- [ ] 강령 [`PIPELINE_CHARTER.md`](../auto/PIPELINE_CHARTER.md)에 의도 반영

**B만 바꿀 때**

- [ ] `site.ts` / JsonLd / `sitemap`·색인 정책
- [ ] 운영 모드(standby)는 Edge·미들웨어 계약 유지

**둘 다 건드릴 때**

- [ ] 순서: 먼저 B 스테이징 → A 스테이징 → 프로덕션은 별도 PR

## 기릿

한 레포 안에서 **역할만 나누면** 모노레포 이점은 유지하면서, 배포·비밀·장애 반경은 줄어듭니다.
