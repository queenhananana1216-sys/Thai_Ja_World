#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

LLANGKKA_ROOT="${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}"
DATA_ROOT="${LLANGKKA_DATA_ROOT:-$LLANGKKA_ROOT}"
MODELS_DIR="$DATA_ROOT/offline-ai/data/models"
export OLLAMA_MODELS="$MODELS_DIR"

MODEL="${LLANGKKA_OLLAMA_MODEL:-qwen2.5:7b}"

llangkka_ollama_bin() {
  if [[ -n "${LLANGKKA_OLLAMA_BIN:-}" ]]; then
    if [[ -x "$LLANGKKA_OLLAMA_BIN" ]]; then printf '%s' "$LLANGKKA_OLLAMA_BIN"; return 0; fi
    if command -v "$LLANGKKA_OLLAMA_BIN" >/dev/null 2>&1; then command -v "$LLANGKKA_OLLAMA_BIN"; return 0; fi
  fi
  if command -v ollama >/dev/null 2>&1; then command -v ollama; return 0; fi
  if command -v ollama.exe >/dev/null 2>&1; then command -v ollama.exe; return 0; fi
  local winuser
  winuser="$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')"
  if [[ -n "$winuser" ]]; then
    local p1="/mnt/c/Users/${winuser}/AppData/Local/Programs/Ollama/ollama.exe"
    if [[ -x "$p1" ]]; then printf '%s' "$p1"; return 0; fi
  fi
  local p2="/mnt/c/Program Files/Ollama/ollama.exe"
  if [[ -x "$p2" ]]; then printf '%s' "$p2"; return 0; fi
  return 1
}

OLLAMA_CMD="$(llangkka_ollama_bin)" || {
  echo "ollama를 찾을 수 없습니다. Windows Ollama 설치 또는 LLANGKKA_OLLAMA_BIN 지정." >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  echo "사용법: gpt.sh <prompt>" >&2
  exit 1
fi

PROMPT="$*"

SYS_PROMPT="You are an offline assistant. Reply in the same language as the user (Thai => Thai, English => English). Be helpful and flexible, and support code when asked."

FULL_PROMPT="$SYS_PROMPT"$'\n'"User: $PROMPT"

"$OLLAMA_CMD" run "$MODEL" "$FULL_PROMPT"

