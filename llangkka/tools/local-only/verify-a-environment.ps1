<#
.SYNOPSIS
  A(로컬 전용) 환경이 갖춰졌는지 빠르게 점검합니다.

.DESCRIPTION
  - 127.0.0.1:11434 Ollama API 응답
  - (선택) argos-translate 명령 존재
  - LLANGKKA_PRIVACY_MODE, OLLAMA_HOST, LLANGKKA_DATA_ROOT 표시
  - RST는 수동 설정(Ollama만) 안내
#>

$ErrorActionPreference = "Continue"

try {
  if ($null -ne [Console]::OutputEncoding) {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  }
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

Write-Host ""
Write-Host "=== llangkka A 환경 점검 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[환경 변수]"
Write-Host "  LLANGKKA_PRIVACY_MODE = $env:LLANGKKA_PRIVACY_MODE"
Write-Host "  LLANGKKA_OLLAMA_API   = $env:LLANGKKA_OLLAMA_API"
Write-Host "  OLLAMA_HOST (시스템)  = $env:OLLAMA_HOST"
Write-Host "  LLANGKKA_DATA_ROOT    = $env:LLANGKKA_DATA_ROOT"
Write-Host "  LLANGKKA_ROOT         = $env:LLANGKKA_ROOT"
Write-Host ""

$ollamaOk = $false
try {
  $null = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5 -UserAgent "llangkka-verify-a"
  Write-Host "[Ollama] OK — http://127.0.0.1:11434/api/tags 응답" -ForegroundColor Green
  $ollamaOk = $true
} catch {
  Write-Host "[Ollama] FAIL — 로컬 Ollama가 안 떠 있거나 11434가 막혔습니다." -ForegroundColor Red
  Write-Host "         $_" -ForegroundColor DarkGray
}

Write-Host ""
if (Get-Command argos-translate -ErrorAction SilentlyContinue) {
  Write-Host "[Argos] argos-translate 명령 있음 (터미널 로컬 번역 가능)" -ForegroundColor Green
} else {
  Write-Host "[Argos] argos-translate 없음 — 터미널 오프라인 번역은 extensions/offline-translation/setup 참고" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[RSTGameTranslation] 수동 확인 필수" -ForegroundColor Yellow
Write-Host "  Settings → Translation → Ollama 만 사용 (Google 등 클라우드 끔)"
Write-Host "  주소: http://127.0.0.1:11434"
Write-Host ""

Write-Host "가이드: docs\local-only-privacy-setup-ko.md"
Write-Host ""

if (-not $ollamaOk) {
  exit 1
}
exit 0
