# llangkka offline GPT wrapper (Windows PowerShell 7)
#
# 사용 예:
#   .\\gpt.ps1 -Prompt "Hello! Translate to Thai and explain."
#   $env:LLANGKKA_OLLAMA_MODEL="qwen2.5:7b"
#   .\\gpt.ps1 -Prompt "สวัสดี"

param(
  [Parameter(Mandatory = $true)][string]$Prompt,
  [string]$Model = $env:LLANGKKA_OLLAMA_MODEL
)

$ErrorActionPreference = "Stop"

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$modelsDir = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\\offline-ai\\data\\models"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-ai\\data\\models"
}
$env:OLLAMA_MODELS = $modelsDir

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw "ollama 명령을 찾지 못했습니다. Ollama 설치가 필요합니다."
}

if (-not $Model) {
  # 모델 태그/이름은 사용자 환경에 따라 다를 수 있습니다.
  # 먼저 `ollama list`로 가능한 모델을 확인해 주세요.
  $Model = "qwen2.5:7b"
}

$sysPrompt = @"
You are an offline assistant.
Reply in the same language as the user (Thai => Thai, English => English).
Be helpful and flexible, and support code when asked.
"@

$fullPrompt = "$sysPrompt`nUser: $Prompt"

& ollama run $Model $fullPrompt

