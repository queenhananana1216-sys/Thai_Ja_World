# llangkka offline translation wrapper (Windows PowerShell 7)
# 사용 예:
#   .\\translate.ps1 -Text "สวัสดี" -From th      # 태국어 -> 한글
#   .\\translate.ps1 -Text "Hello"              # 자동 From 판별, 기본은 한글(ko) 출력
#   .\\translate.ps1 -Text "안녕"               # 한글 -> 기본은 영어(en)
#   .\\translate.ps1 -Text "안녕" -From ko -To en # 한글 -> 영어
#   .\\translate.ps1 -Text "안녕" -From ko -To th # 한글 -> 태국어

param(
  [Parameter(Mandatory = $true)][string]$Text,
  [ValidateSet("auto","th","en","ko")][string]$From = "auto",
  [ValidateSet("ko","th","en")][string]$To = "ko"
)

$ErrorActionPreference = "Stop"

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$packagesDir = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\\offline-translation\\data\\packages"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-translation\\packages"
}
$env:ARGOS_PACKAGES_DIR = $packagesDir

if (-not (Get-Command "argos-translate" -ErrorAction SilentlyContinue)) {
  throw "argos-translate 명령을 찾을 수 없습니다. 먼저 setup.ps1 + download-models.ps1을 실행하세요."
}

if ($From -eq "auto") {
  if ($Text -match "[\u0E00-\u0E7F]") {
    $From = "th"
  } elseif ($Text -match "[\uAC00-\uD7AF]") {
    $From = "ko"
  } else {
    $From = "en"
  }
}

# 입력이 한글(ko)인데 사용자가 -To를 안 주면, 기본은 영어(en)로 “반대로” 출력
if (-not $PSBoundParameters.ContainsKey('To') -and $From -eq 'ko') {
  $To = "en"
}

& argos-translate --from-lang $From --to-lang $To $Text

