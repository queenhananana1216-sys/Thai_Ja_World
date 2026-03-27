<#
.SYNOPSIS
  현재 PowerShell 세션을 llangkka "A(로컬 전용)" 힌트에 맞춥니다. 네트워크를 물리적으로 막지는 않습니다.

.DESCRIPTION
  - LLANGKKA_PRIVACY_MODE=A 표시
  - LLANGKKA_OLLAMA_API=http://127.0.0.1:11434 (표시/스크립트용, OLLAMA_HOST는 건드리지 않음)
  - 화면 번역 안내 문서 경로 출력

  WSL에서 Windows Ollama를 쓰는 등 특수 구성이면 이 스크립트를 쓰지 말고 환경을 수동으로 맞추세요.
#>

$ErrorActionPreference = "Stop"

try {
  if ($null -ne [Console]::OutputEncoding) {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  }
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

$env:LLANGKKA_PRIVACY_MODE = "A"

# Ollama 기본값은 로컬(127.0.0.1:11434). OLLAMA_HOST는 서버 바인딩에도 쓰이므로 여기서 건드리지 않음.
$env:LLANGKKA_OLLAMA_API = "http://127.0.0.1:11434"

Write-Host @"

[A 환경] 이 세션에 적용됨
  LLANGKKA_PRIVACY_MODE = A
  LLANGKKA_OLLAMA_API   = $env:LLANGKKA_OLLAMA_API

다음 확인:
  .\tools\local-only\verify-a-environment.ps1

가이드:
  docs\local-only-privacy-setup-ko.md

"@
