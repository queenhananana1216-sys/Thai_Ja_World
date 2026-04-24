#!/usr/bin/env bash
set -euo -o pipefail

if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

LLANGKKA_ROOT="${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}"

if [[ -n "${LLANGKKA_DATA_ROOT:-}" ]]; then
  PACKAGES_DIR="$LLANGKKA_DATA_ROOT/offline-translation/packages"
else
  PACKAGES_DIR="$LLANGKKA_ROOT/extensions/offline-translation/data/packages"
fi

export ARGOS_PACKAGES_DIR="${ARGOS_PACKAGES_DIR:-$PACKAGES_DIR}"

FROM="${LLANGKKA_TRANSLATE_FROM:-auto}"
TO="${LLANGKKA_TRANSLATE_TO:-ko}"
TO_SET=0
TEXT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="${2:-auto}"; shift 2 ;;
    --to) TO="${2:-ko}"; TO_SET=1; shift 2 ;;
    *) TEXT="$*"; break ;;
  esac
done

if [[ -z "$TEXT" ]]; then
  echo "사용법: translate.sh [--from auto|th|en|ko] [--to ko|th|en] <텍스트>" >&2
  exit 1
fi

if ! command -v argos-translate >/dev/null 2>&1; then
  echo "argos-translate이 없습니다. 먼저 setup.sh + download.sh를 실행하세요." >&2
  exit 1
fi

if [[ "$FROM" == "auto" ]]; then
  if command -v rg >/dev/null 2>&1; then
    if echo "$TEXT" | rg -q "[\\u0E00-\\u0E7F]"; then
      FROM="th"
    elif echo "$TEXT" | rg -q "[\\uAC00-\\uD7A3]"; then
      FROM="ko"
    else
      FROM="en"
    fi
  else
    if echo "$TEXT" | grep -Pq "[\\x{0E00}-\\x{0E7F}]"; then
      FROM="th"
    elif echo "$TEXT" | grep -Pq "[\\x{AC00}-\\x{D7A3}]"; then
      FROM="ko"
    else
      FROM="en"
    fi
  fi
fi

# 입력이 한글(ko)인데 사용자가 --to를 안 주면, 기본은 영어(en)로 “반대로” 출력
if [[ "${TO_SET}" == "0" && "$FROM" == "ko" ]]; then
  TO="${LLANGKKA_TRANSLATE_KO_TO:-en}"
fi

has_pair() {
  # 설치된 패키지가 없으면 여기서 에러가 날 수 있어 조용히 처리
  argospm search --from-lang "$1" --to-lang "$2" >/dev/null 2>&1
}

# th->ko가 없으면 th->en->ko 체인으로 fallback
if [[ "$FROM" == "th" && "$TO" == "ko" ]]; then
  if argos-translate --from-lang th --to-lang ko "test" >/dev/null 2>&1; then
    argos-translate --from-lang th --to-lang ko "$TEXT"
  else
    # 체인 번역: 태국어 -> 영어 -> 한글
    if ! command -v argos-translate >/dev/null 2>&1; then
      echo "argos-translate이 없습니다." >&2
      exit 1
    fi
    mid="$(argos-translate --from-lang th --to-lang en "$TEXT" 2>/dev/null || true)"
    if [[ -z "$mid" ]]; then
      echo "태국어->영어 번역이 실패했습니다. translate-th_en 패키지가 설치됐는지 확인하세요." >&2
      exit 1
    fi
    argos-translate --from-lang en --to-lang ko "$mid"
  fi
else
  argos-translate --from-lang "$FROM" --to-lang "$TO" "$TEXT"
fi

