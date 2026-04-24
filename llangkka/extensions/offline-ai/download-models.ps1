# llangkka Ollama models download (Windows PowerShell 7)
# - SSD 모델 폴더로 받기 위해 OLLAMA_MODELS를 고정
# - 인터넷 필요(오프라인이면 기존 모델만 사용)

$ErrorActionPreference = "Stop"

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$modelsDir = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\\offline-ai\\data\\models"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-ai\\data\\models"
}
$env:OLLAMA_MODELS = $modelsDir

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw "ollama 명령을 찾지 못했습니다. Ollama를 먼저 설치하세요."
}

$model = $env:LLANGKKA_OLLAMA_MODEL
if (-not $model) {
  # 모델명은 본인 환경에 맞게 바꿔주세요.
  $model = "qwen2.5:7b"
}

Write-Host "모델 다운로드 시도: $model"
& ollama pull $model

Write-Host "완료: $model 모델을 SSD에 받았습니다(OLLAMA_MODELS 고정)."

