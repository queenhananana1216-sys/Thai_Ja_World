/**
 * 선택적 엣지 가드: 원본(예: Vercel)으로 프록시하면서 보안 헤더를 덧붙입니다.
 * 배포 전 Cloudflare에서 라우트·ORIGIN_HOST(또는 env)를 설정하세요.
 *
 * 단순 DNS 프록시만 쓰는 경우 이 Worker 없이 WAF+Access만으로도 충분한 경우가 많습니다.
 */

export interface Env {
  /** 예: thaijaworld-xxx.vercel.app — 팀 도메인으로 통일 */
  ORIGIN_HOST: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const originHost = env.ORIGIN_HOST?.trim();
    if (!originHost) {
      return new Response('ORIGIN_HOST not configured', { status: 503 });
    }

    const url = new URL(request.url);
    url.hostname = originHost;
    url.protocol = 'https:';

    const upstream = new Request(url.toString(), request);
    const res = await fetch(upstream);

    const headers = new Headers(res.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  },
};
