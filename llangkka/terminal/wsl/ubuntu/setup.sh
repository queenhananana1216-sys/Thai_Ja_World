#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLANGKKA_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

PROFILE_SCRIPT="$LLANGKKA_ROOT/terminal/wsl/ubuntu/profile.sh"
BASHRC="$HOME/.bashrc"
MARKER_BEGIN="# llangkka terminal"

if [[ ! -f "$PROFILE_SCRIPT" ]]; then
  echo "profile.sh를 찾을 수 없습니다: $PROFILE_SCRIPT" >&2
  exit 1
fi

touch "$BASHRC"

if command -v rg >/dev/null 2>&1; then
  already_set="$(rg -qF "$MARKER_BEGIN" "$BASHRC" 2>/dev/null && echo 1 || echo 0)"
else
  already_set="$(grep -qF "$MARKER_BEGIN" "$BASHRC" 2>/dev/null && echo 1 || echo 0)"
fi

if [[ "$already_set" != "1" ]]; then
  cat >>"$BASHRC" <<EOF

$MARKER_BEGIN
export LLANGKKA_ROOT="$LLANGKKA_ROOT"
if [[ -f "$PROFILE_SCRIPT" ]]; then
  source "$PROFILE_SCRIPT"
fi
EOF
  echo "완료: $BASHRC 에 llangkka 터미널 스니펫을 추가했습니다."
else
  echo "이미 설정됨: $BASHRC (l llangkka terminal)"
fi

