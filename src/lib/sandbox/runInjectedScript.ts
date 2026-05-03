import 'server-only';

/**
 * DB에 저장된 사용자 스크립트를 서버에서 실행합니다.
 * 코드는 **async 함수 본문**처럼 작성합니다 (`ctx`만 사용 권장).
 *
 * 보안: AsyncFunction은 본질적으로 신뢰할 수 없는 코드 실행과 동일합니다.
 * 오너 전용 주입·크론 경로에서만 호출하고, 네트워크·파일 접근은 ctx로 최소만 노출합니다.
 */
const MAX_SCRIPT_CHARS = 400_000;

type AsyncFnConstructor = new (...args: string[]) => (...fnArgs: unknown[]) => Promise<unknown>;

function getAsyncFunction(): AsyncFnConstructor {
  return Object.getPrototypeOf(async function () {}).constructor as AsyncFnConstructor;
}

export async function runInjectedScript(
  code: string,
  ctx: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = code.trim();
  if (!trimmed.length) return { ok: false, error: 'empty_script' };
  if (trimmed.length > MAX_SCRIPT_CHARS) return { ok: false, error: 'script_too_large' };

  let fn: (...args: unknown[]) => Promise<unknown>;
  try {
    fn = new (getAsyncFunction())('ctx', trimmed);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'parse_error' };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error('sandbox_timeout')), timeoutMs);
  });

  try {
    await Promise.race([fn(ctx), timeoutPromise]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
