#!/usr/bin/env bash
set -euo -o pipefail

# 호출자가 실수로 `sh`로 실행해도 무조건 bash로 재진입
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

LLANGKKA_ROOT="${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}"

if [[ -n "${LLANGKKA_DATA_ROOT:-}" ]]; then
  PACKAGES_DIR="$LLANGKKA_DATA_ROOT/offline-translation/packages"
else
  PACKAGES_DIR="$LLANGKKA_ROOT/extensions/offline-translation/data/packages"
fi

mkdir -p "$PACKAGES_DIR"
export ARGOS_PACKAGES_DIR="${ARGOS_PACKAGES_DIR:-$PACKAGES_DIR}"

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "python3/python이 필요합니다." >&2
  exit 1
fi

"$PY" -m pip install --upgrade pip
"$PY" -m pip install --upgrade argostranslate

echo "완료: argostranslate 설치"
echo "다음: download.sh (인터넷 가능할 때 1회 권장)"

