# llangkka terminal setup (PowerShell 7)
# 목적:
# - PowerShell 프로필($PROFILE)에 llangkka의 profile.ps1를 안전하게 연결(중복 방지)
# - starship 설치는 사용자가 직접 하도록 안내(네트워크/권한 이슈 방지)

$ErrorActionPreference = "Stop"

$thisFile = $MyInvocation.MyCommand.Path
$terminalPowershellDir = Split-Path -Parent $thisFile
$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $terminalPowershellDir)

$targetProfileScript = Join-Path $terminalPowershellDir "profile.ps1"
$marker = "# llangkka terminal profile"

if (!(Test-Path $targetProfileScript)) {
  throw "profile.ps1을 찾을 수 없습니다: $targetProfileScript"
}

# PowerShell 프로필 파일 위치(현재 호스트/현재 사용자의 범위)
$profilePath = $PROFILE

if (-not $profilePath) {
  throw "현재 PowerShell 프로필 경로($PROFILE)를 확인할 수 없습니다."
}

$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path $profileDir)) {
  New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
}

if (!(Test-Path $profilePath)) {
  New-Item -ItemType File -Force -Path $profilePath | Out-Null
}

$existing = Get-Content -Path $profilePath -Raw -ErrorAction SilentlyContinue
if ($existing -notmatch [regex]::Escape($marker)) {
  $block = @"

$marker
`.${targetProfileScript}
"@
  Add-Content -Path $profilePath -Value $block
}

Write-Host "완료: $marker 를 $profilePath 에 연결했습니다."
Write-Host "다음 확인: PowerShell에서 `starship --version`이 되면 자동으로 프롬프트가 적용됩니다."

