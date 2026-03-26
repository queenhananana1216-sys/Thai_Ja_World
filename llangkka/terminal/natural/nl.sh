#!/usr/bin/env bash
# llangkka: 자연어(한국어 등) -> bash 명령 1줄 생성 (Ollama, WSL/Ubuntu)
# 사용: nl "현재 폴더에서 큰 파일 5개만 보여줘"
# 자동 실행: export LLANGKKA_NL_AUTO=1
#
# WSL: Windows에만 Ollama를 깔았으면 PATH에 ollama가 없을 수 있음 -> ollama.exe 또는 일반 설치 경로 사용
# 수동 지정: export LLANGKKA_OLLAMA_BIN="/mnt/c/Users/본인윈도우계정/AppData/Local/Programs/Ollama/ollama.exe"

llangkka_ollama_bin() {
  if [[ -n "${LLANGKKA_OLLAMA_BIN:-}" ]]; then
    if [[ -x "$LLANGKKA_OLLAMA_BIN" ]]; then
      printf '%s' "$LLANGKKA_OLLAMA_BIN"
      return 0
    fi
    if command -v "$LLANGKKA_OLLAMA_BIN" >/dev/null 2>&1; then
      command -v "$LLANGKKA_OLLAMA_BIN"
      return 0
    fi
  fi
  if command -v ollama >/dev/null 2>&1; then
    command -v ollama
    return 0
  fi
  if command -v ollama.exe >/dev/null 2>&1; then
    command -v ollama.exe
    return 0
  fi
  local winuser
  winuser="$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')"
  if [[ -n "$winuser" ]]; then
    local p1="/mnt/c/Users/${winuser}/AppData/Local/Programs/Ollama/ollama.exe"
    if [[ -x "$p1" ]]; then
      printf '%s' "$p1"
      return 0
    fi
  fi
  local p2="/mnt/c/Program Files/Ollama/ollama.exe"
  if [[ -x "$p2" ]]; then
    printf '%s' "$p2"
    return 0
  fi
  return 1
}

nl() {
  local query="$*"
  query="${query//[[:space:]]/ }"
  query="${query#"${query%%[![:space:]]*}"}"
  query="${query%"${query##*[![:space:]]}"}"
  if [[ -z "$query" ]]; then
    echo "사용법: nl <자연어 요청>" >&2
    echo '예: nl "현재 폴더 용량 큰 파일 위에서 5개만"' >&2
    return 1
  fi

  local ollama_cmd
  if ! ollama_cmd="$(llangkka_ollama_bin)"; then
    echo "nl: ollama를 찾을 수 없습니다. Windows에 Ollama 설치 후 WSL에서 ollama.exe가 보이는지 확인하거나," >&2
    echo "   export LLANGKKA_OLLAMA_BIN='/mnt/c/Users/윈도우계정/AppData/Local/Programs/Ollama/ollama.exe'" >&2
    return 1
  fi

  local model="${LLANGKKA_OLLAMA_MODEL:-qwen2.5:7b}"
  local sys
  sys=$'당신은 Ubuntu(WSL) bash 전문가다. 사용자는 한국어 또는 자연어로 요청한다.\n'
  sys+=$'규칙:\n'
  sys+=$'1) 출력은 반드시 실행할 bash 명령 "한 줄"만. 앞뒤 공백 없이.\n'
  sys+=$'2) 설명, 주석, 마크다운, 코드펜스(```), 여러 줄 금지.\n'
  sys+=$'3) 여러 단계면 파이프(|) 또는 && 로 한 줄로 합친다.\n'
  sys+=$'4) 위험한 요청(디스크 파괴, rm -rf /, dd 등)이면 한 줄만: echo "[거부됨] 안전하지 않은 요청입니다"'

  local prompt
  prompt="${sys}"$'\n\n'"요청: ${query}"

  local raw
  if ! raw="$("$ollama_cmd" run "$model" "$prompt" 2>/dev/null)"; then
    echo "nl: ollama 실행 실패 ($ollama_cmd)" >&2
    return 1
  fi

  local cmd
  cmd="$(printf '%s\n' "$raw" | awk '
    /^```/ { incode=!incode; next }
    incode==1 && $0!="" { print; exit }
  ')"
  if [[ -z "$cmd" ]]; then
    cmd="$(printf '%s\n' "$raw" | grep -v '^[[:space:]]*#' | grep -v '^[[:space:]]*$' | head -n1)"
  fi
  cmd="$(echo "$cmd" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [[ -z "$cmd" ]]; then
    echo "nl: 명령을 생성하지 못했습니다." >&2
    return 1
  fi

  printf '\n%s\n' "[제안 명령]"
  printf '%s\n' "$cmd"

  if [[ "${LLANGKKA_NL_AUTO:-0}" == "1" ]]; then
    eval "$cmd"
    return
  fi
  read -r -p "실행할까요? (y/N) " ans
  if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
    eval "$cmd"
  fi
}
