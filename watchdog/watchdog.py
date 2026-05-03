#!/usr/bin/env python3
"""
Chaos Watchdog — tail sibling container logs via Docker API (docker logs -f).
Detects error signatures and emits LLM-ready remediation prompts (stdout + optional webhooks + file).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import deque
from datetime import datetime, timezone
from typing import Callable, List, Optional, Pattern, Tuple

# --- Config (env) ---
PROJECT = os.environ.get("COMPOSE_PROJECT_NAME", "thaija-world").strip()
SERVICE = os.environ.get("WATCH_SERVICE", "thaija-web").strip()
DEBOUNCE_SEC = float(os.environ.get("WATCHDOG_DEBOUNCE_SEC", "90"))
CONTEXT_LINES = max(5, int(os.environ.get("WATCHDOG_CONTEXT_LINES", "28")))
ALERT_LOG_PATH = os.environ.get("ALERT_LOG_PATH", "/var/log/watchdog/alerts.log").strip()
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "").strip()
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
PROMPT_OUT_DIR = os.environ.get("WATCHDOG_PROMPT_OUT_DIR", "").strip()
FIX_PROMPT_FILENAME = os.environ.get(
    "WATCHDOG_FIX_PROMPT_FILENAME", "WATCHDOG_FIX_PROMPT.txt"
).strip()

SANDBOX_INGEST_URL = os.environ.get("SANDBOX_PROPOSAL_INGEST_URL", "").strip()
SANDBOX_INGEST_SECRET = os.environ.get("SANDBOX_PROPOSAL_INGEST_SECRET", "").strip()

EXTRA_RAW = os.environ.get("WATCHDOG_EXTRA_REGEX", "").strip()
EXTRA_PATTERNS: List[Tuple[Pattern[str], str]] = []
if EXTRA_RAW:
    try:
        EXTRA_PATTERNS.append((re.compile(EXTRA_RAW, re.I), "custom_regex"))
    except re.error as e:
        print(f"[watchdog] Invalid WATCHDOG_EXTRA_REGEX: {e}", file=sys.stderr)

KEYWORD_PATTERNS: List[Tuple[Pattern[str], str]] = [
    (re.compile(r"500\s+Internal\s+Server\s+Error", re.I), "http_500"),
    (re.compile(r"Internal\s+Server\s+Error", re.I), "http_500_generic"),
    (re.compile(r"\bPGRST\d+", re.I), "supabase_postgrest_code"),
    (re.compile(r"\bPGRST\b", re.I), "supabase_postgrest"),
    (re.compile(r"\btimeout\b", re.I), "timeout_word"),
    (re.compile(r"ETIMEDOUT", re.I), "etimedout"),
    (re.compile(r"ECONNRESET", re.I), "econnreset"),
    (re.compile(r"ECONNREFUSED", re.I), "econnrefused"),
] + EXTRA_PATTERNS

_last_sent: dict[str, float] = {}
_buffer: deque[str] = deque(maxlen=CONTEXT_LINES)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _signature(kind: str, line: str) -> str:
    h = hashlib.sha256(f"{kind}|{line[:240]}".encode("utf-8", errors="replace")).hexdigest()[:16]
    return f"{kind}:{h}"


def _debounced(sig: str) -> bool:
    t = time.monotonic()
    prev = _last_sent.get(sig)
    if prev is not None and (t - prev) < DEBOUNCE_SEC:
        return True
    _last_sent[sig] = t
    # prune old entries occasionally
    if len(_last_sent) > 500:
        cutoff = t - DEBOUNCE_SEC * 4
        for k, v in list(_last_sent.items()):
            if v < cutoff:
                del _last_sent[k]
    return False


def _match_kind(line: str) -> Optional[str]:
    for rx, kind in KEYWORD_PATTERNS:
        if rx.search(line):
            return kind
    return None


def _build_prompt(kind: str, trigger_line: str, context: List[str]) -> str:
    ctx = "\n".join(context[-CONTEXT_LINES:])
    guides = {
        "http_500": (
            "Next.js Route Handler / Server Component에서 예외가 난 경우가 많습니다. "
            "`app/api/**/route.ts`와 호출 스택을 확인하고, Supabase 클라이언트(env 누락·RLS·service role 오남용)를 점검하세요."
        ),
        "http_500_generic": (
            "프록시/업스트림에서 500이 찍혔을 수 있습니다. 앱 로그의 스택 트레이스와 요청 경로·메서드를 먼저 매칭하세요."
        ),
        "supabase_postgrest_code": (
            "PostgREST(PGRST*) 코드는 보통 스키마·RLS·컬럼 타입·FK 제약과 연관됩니다. "
            "대상 테이블·RPC·policy를 열고 마이그레이션과 일치하는지 확인하세요."
        ),
        "supabase_postgrest": (
            "Supabase/PostgREST 계층 오류입니다. 요청 URL·헤더(Authorization)·RLS·스키마 노출을 확인하세요."
        ),
        "timeout_word": (
            "외부 API·DB·네트워크 지연 가능성이 큽니다. 타임아웃 값, 재시도, 연결 풀, 리전 간 레이턴시를 확인하세요."
        ),
        "etimedout": (
            "소켓 레벨 타임아웃입니다. DNS/방화벽/대상 호스트 가용성과 keep-alive 설정을 확인하세요."
        ),
        "econnreset": (
            "연결이 상대가 리셋했습니다. 업스트림 크래시·LB idle timeout·TLS 중단 가능성을 확인하세요."
        ),
        "econnrefused": (
            "연결 거부입니다. 포트·호스트명·컨테이너 간 네트워크(docker network)·서비스 기동 순서를 확인하세요."
        ),
        "custom_regex": "사용자 정의(WATCHDOG_EXTRA_REGEX) 패턴과 일치했습니다. 주변 로그로 원인 범위를 좁히세요.",
    }
    guide = guides.get(kind, "로그 맥락을 바탕으로 원인 후보를 좁히고 재현 경로를 고정하세요.")

    return f"""## Chaos Watchdog — 감지 요약 ({_now_iso()})
- **프로젝트/서비스**: `{PROJECT}` / `{SERVICE}`
- **시그니처 유형**: `{kind}`
- **트리거 한 줄**:
```
{trigger_line.strip()[:800]}
```

### 최근 로그 맥락 (docker logs 스트림, 최대 {CONTEXT_LINES}줄)
```
{ctx[:12000]}
```

---

## Cursor / LLM에 그대로 붙여 넣을 수정 지시 프롬프트

당신은 **Next.js 15(App Router) + Supabase** 코드베이스(`taeja-world`)의 시니어 엔지니어입니다.
위 **트리거 한 줄**과 **맥락 로그**를 근거로, 아래를 수행하세요.

1. **가능한 근본 원인**을 2~4개 가설로 나열하고, 각 가설에 대해 **어떤 파일/라우트**를 먼저 열어야 하는지 제시하세요. (추측은 추측이라고 명시)
2. **즉시 적용 가능한 수정안**(코드 스니펫 또는 패치 형태)을 제시하세요. 환경변수·RLS·크론 인증(`CRON_SECRET`)·서버 전용 키 유출 여부를 반드시 점검하세요.
3. **회귀 방지**: API 입력은 `zod` 스키마로 경계(문자열 길이·유니코드·선택 필드)를 단단히 하고, 로깅·타임아웃·경계 조건 테스트를 어떻게 추가할지 한 단락으로 제안하세요.

**힌트(워치독 가이드)**: {guide}
"""


def _truncate(s: str, n: int) -> str:
    s = s.strip()
    if len(s) <= n:
        return s
    return s[: n - 12] + "\n...[truncated]"


def _emit_stdout(text: str) -> None:
    print("\n" + "=" * 72 + "\n" + text + "\n" + "=" * 72 + "\n", flush=True)


def _write_fix_prompt_file(prompt: str) -> None:
    """호스트 프로젝트 루트에 바인드 마운트된 경로에 수정 프롬프트를 덮어씁니다."""
    if not PROMPT_OUT_DIR:
        return
    safe_name = os.path.basename(FIX_PROMPT_FILENAME) or "WATCHDOG_FIX_PROMPT.txt"
    path = os.path.join(PROMPT_OUT_DIR, safe_name)
    header = (
        "오너님, DB 스키마 에러가 발생했습니다. 아래 프롬프트를 커서에 복사하세요...\n\n"
    )
    try:
        os.makedirs(PROMPT_OUT_DIR, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(header)
            f.write(prompt)
        print(f"[watchdog] wrote fix prompt file: {path}", flush=True)
    except OSError as e:
        print(f"[watchdog] fix prompt file write failed: {e}", file=sys.stderr)


def _append_file(path: str, text: str) -> None:
    try:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(text + "\n")
    except OSError as e:
        print(f"[watchdog] log file write failed: {e}", file=sys.stderr)


def _post_json(url: str, payload: dict, timeout: float = 12.0) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        resp.read()


def _post_sandbox_ingest(payload: dict, timeout: float = 14.0) -> None:
    if not SANDBOX_INGEST_URL or not SANDBOX_INGEST_SECRET:
        return
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        SANDBOX_INGEST_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SANDBOX_INGEST_SECRET}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        resp.read()


def _notify_sandbox_ingest(kind: str, sig: str, prompt: str) -> None:
    """관리자 샌드박스 큐에 파이프라인 초안을 적재(오너가 Inject로 active_scripts로 승격)."""
    try:
        scaffold = (
            "// Watchdog 자동 제안 — 크론 실행용 AsyncFunction 본문만 작성하세요.\n"
            "// 예: ctx.log('heartbeat', ctx.nowIso()); await Promise.resolve();\n\n"
        )
        _post_sandbox_ingest(
            {
                "title": f"🛡️ 신규 취약점 방어 패치 제안 · {kind}",
                "description": f"signature={sig}",
                "code_text": scaffold + prompt,
                "language": "typescript",
                "pipeline_kind": kind,
                "source": "watchdog",
                "trigger_context": {"signature": sig, "kind": kind},
                "external_ref": sig,
            }
        )
    except urllib.error.URLError as e:
        print(f"[watchdog] sandbox ingest failed: {e}", file=sys.stderr)


def _notify_slack(text: str) -> None:
    if not SLACK_WEBHOOK_URL:
        return
    _post_json(SLACK_WEBHOOK_URL, {"text": _truncate(text, 11000)})


def _notify_discord(text: str) -> None:
    if not DISCORD_WEBHOOK_URL:
        return
    _post_json(DISCORD_WEBHOOK_URL, {"content": _truncate(text, 1900)})


def _resolve_container_id() -> Optional[str]:
    cmd = [
        "docker",
        "ps",
        "-q",
        "-f",
        f"label=com.docker.compose.service={SERVICE}",
        "-f",
        f"label=com.docker.compose.project={PROJECT}",
    ]
    try:
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError:
        return None
    if not out:
        return None
    return out.split("\n")[0]


def _wait_for_container(
    log: Callable[[str], None],
    retries: int = 90,
    delay: float = 2.0,
) -> str:
    for i in range(retries):
        cid = _resolve_container_id()
        if cid:
            log(f"[watchdog] Tracking container {cid[:12]}… (project={PROJECT}, service={SERVICE})")
            return cid
        log(f"[watchdog] Waiting for `{SERVICE}` container… ({i + 1}/{retries})")
        time.sleep(delay)
    raise RuntimeError(f"No running container for service={SERVICE} project={PROJECT}")


def _stream_logs(cid: str, on_line: Callable[[str], None]) -> int:
    proc = subprocess.Popen(
        ["docker", "logs", "-f", "--tail", str(CONTEXT_LINES), cid],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    assert proc.stdout is not None
    try:
        for line in proc.stdout:
            on_line(line.rstrip("\n"))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    return proc.returncode or 0


def main() -> None:
    def log(msg: str) -> None:
        print(msg, flush=True)

    log(
        f"[watchdog] Chaos Watchdog starting — debounce={DEBOUNCE_SEC}s context={CONTEXT_LINES} "
        f"slack={'on' if SLACK_WEBHOOK_URL else 'off'} discord={'on' if DISCORD_WEBHOOK_URL else 'off'} "
        f"sandbox_ingest={'on' if SANDBOX_INGEST_URL else 'off'} "
        f"alert_log={ALERT_LOG_PATH} prompt_out={PROMPT_OUT_DIR or '(disabled)'}"
    )

    while True:
        try:
            cid = _wait_for_container(log)
        except RuntimeError as e:
            log(f"[watchdog] FATAL: {e}")
            sys.exit(1)

        def handle_line(line: str) -> None:
            if not line:
                return
            _buffer.append(line)
            kind = _match_kind(line)
            if not kind:
                return
            sig = _signature(kind, line)
            if _debounced(sig):
                return
            prompt = _build_prompt(kind, line, list(_buffer))
            _emit_stdout(prompt)
            _write_fix_prompt_file(prompt)
            _append_file(ALERT_LOG_PATH, "\n" + prompt)
            try:
                _notify_slack(prompt)
                _notify_discord(prompt)
            except urllib.error.URLError as e:
                log(f"[watchdog] webhook error: {e}")
            try:
                _notify_sandbox_ingest(kind, sig, prompt)
            except Exception as e:
                log(f"[watchdog] sandbox ingest error: {e}")

        rc = _stream_logs(cid, handle_line)
        log(f"[watchdog] docker logs stream ended (code={rc}); reconnecting in 2s…")
        time.sleep(2.0)


if __name__ == "__main__":
    main()
