#!/usr/bin/env bash
set -euo -o pipefail

# 호출자가 실수로 `sh`로 실행해도 무조건 bash로 재진입
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

# 외장 메모리 루트(권장):
#   export LLANGKKA_DATA_ROOT=/mnt/d/llangkka-data
DATA_ROOT="${LLANGKKA_DATA_ROOT:-${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}}"
PACKAGES_DIR="$DATA_ROOT/offline-translation/packages"

echo "DATA_ROOT: $DATA_ROOT"
echo "PACKAGES_DIR: $PACKAGES_DIR"

mkdir -p "$PACKAGES_DIR"
rm -rf "$PACKAGES_DIR"
mkdir -p "$PACKAGES_DIR"

echo "삭제: argos-translate 기본 캐시(경로 꼬임 방지)"
rm -rf "$HOME/.local/share/argos-translate/packages" 2>/dev/null || true
rm -rf "$HOME/.local/cache/argos-translate" 2>/dev/null || true

export ARGOS_PACKAGES_DIR="$PACKAGES_DIR"

SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)

echo "설치: argostranslate"
bash "$SCRIPT_DIR/setup.sh"

echo "다운로드: 태국->한글, 영어->한글 패키지"
LLANGKKA_OFFLINE="${LLANGKKA_OFFLINE:-0}" bash "$SCRIPT_DIR/download.sh"

echo "완료: 오프라인 번역 패키지 재설치 완료"
exit 0

