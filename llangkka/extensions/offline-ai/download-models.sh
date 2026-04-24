#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

LLANGKKA_ROOT="${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}"
DATA_ROOT="${LLANGKKA_DATA_ROOT:-$LLANGKKA_ROOT}"
MODELS_DIR="$DATA_ROOT/offline-ai/data/models"
export OLLAMA_MODELS="$MODELS_DIR"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama가 없습니다. 먼저 Ollama를 설치하세요." >&2
  exit 1
fi

MODEL="${LLANGKKA_OLLAMA_MODEL:-qwen2.5:7b}"
echo "모델 다운로드 시도: $MODEL"
ollama pull "$MODEL"
echo "완료: $MODEL 모델을 SSD에 받았습니다(OLLAMA_MODELS 고정)."

