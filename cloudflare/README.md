# Cloudflare (레포 스텁)

- 전체 가이드: [`docs/CLOUDFLARE_SECURITY.md`](../docs/CLOUDFLARE_SECURITY.md)
- Worker 예시: [`workers/edge-guard`](./workers/edge-guard) — `npm install` 후 `npx wrangler login` · `wrangler deploy`

Vercel만 쓸 때는 DNS를 Cloudflare에 두고 **프록시 + WAF + Access**만으로도 대부분의 “서비스·API 보안·트래픽 통제”가 가능합니다. Worker는 **필수 아님**.
