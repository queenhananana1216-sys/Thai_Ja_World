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
mkdir -p "$PACKAGES_DIR"

if ! command -v argospm >/dev/null 2>&1; then
  echo "argospm이 없습니다. 먼저 setup.sh를 실행하세요." >&2
  exit 1
fi

OFFLINE_MODE="${LLANGKKA_OFFLINE:-0}"
if [[ "$OFFLINE_MODE" != "1" ]]; then
  argospm update
else
  echo "LLANGKKA_OFFLINE=1 이므로 update는 건너뜁니다."
fi

# 우선순위:
# - 가능하면 th->ko 직접 설치
# - 가능하면 ko->en / ko->th 직접 설치
# - 불가능하면 th->en + en->ko(체인 번역)라도 설치
PAIRS=("th:ko" "th:en" "en:ko" "ko:en" "ko:th")
INSTALL_ALL="${LLANGKKA_TRANSLATION_INSTALL_ALL:-0}"

for pair in "${PAIRS[@]}"; do
  from="${pair%%:*}"
  to="${pair##*:}"
  echo "검색/설치 대상: $from -> $to"

  # argospm search 출력에서 translate-... 패키지 id만 추출
  mapfile -t packageIds < <(argospm search --from-lang "$from" --to-lang "$to" 2>/dev/null \
    | sed -E 's/^[[:space:]]*(translate-[^:[:space:]]+).*/\1/' \
    | sed -n '/^translate-/p')

  if [[ ${#packageIds[@]} -eq 0 ]]; then
    echo "패키지 id 추출 실패(검색 출력 확인 필요): $from -> $to" >&2
    continue
  fi

  if [[ "$INSTALL_ALL" != "1" ]]; then
    packageIds=("${packageIds[0]}")
  fi

  for pid in "${packageIds[@]}"; do
    echo "설치 시도: $pid"
    argospm install "$pid" || true
  done
done

echo "완료: 태국/영어/한글 방향 오프라인 번역 패키지 설치(또는 재시도) 완료"

