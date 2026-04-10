# llangkka terminal setup (PowerShell 7 + Windows PowerShell 5.1)
# - 현재 실행 중인 PS 버전의 $PROFILE에 llangkka profile.ps1 연결
# - 옵션: -Both 스위치로 PS 7과 5.1 모두 한 번에 설정

param(
  [switch]$Both
)

$ErrorActionPreference = "Stop"

$thisFile = $MyInvocation.MyCommand.Path
$terminalPowershellDir = Split-Path -Parent $thisFile
$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $terminalPowershellDir)

$targetProfileScript = Join-Path $terminalPowershellDir "profile.ps1"
$marker = "# llangkka terminal profile"

if (!(Test-Path $targetProfileScript)) {
  throw "profile.ps1을 찾을 수 없습니다: $targetProfileScript"
}

function Install-LlangkkaProfile {
  param([string]$ProfilePath, [string]$Label)

  if (-not $ProfilePath) {
    Write-Warning "$Label : 프로필 경로를 확인할 수 없습니다. 건너뜁니다."
    return
  }

  $profileDir = Split-Path -Parent $ProfilePath
  if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
  }
  if (!(Test-Path $ProfilePath)) {
    New-Item -ItemType File -Force -Path $ProfilePath | Out-Null
  }

  $existing = Get-Content -Path $ProfilePath -Raw -ErrorAction SilentlyContinue
  if ($existing -and ($existing -match [regex]::Escape($marker))) {
    Write-Host "이미 설정됨: $Label ($ProfilePath)" -ForegroundColor Yellow
    return
  }

  $block = @"

$marker
. "$targetProfileScript"
"@
  Add-Content -Path $ProfilePath -Value $block
  Write-Host "완료: $Label -> $ProfilePath" -ForegroundColor Green
}

$isPwsh7 = $PSVersionTable.PSVersion.Major -ge 7

Install-LlangkkaProfile -ProfilePath $PROFILE -Label "현재 셸 ($($PSVersionTable.PSVersion))"

if ($Both) {
  if ($isPwsh7) {
    $ps5Profile = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
    Install-LlangkkaProfile -ProfilePath $ps5Profile -Label "Windows PowerShell 5.1"
  } else {
    $pwshExe = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwshExe) {
      $ps7Profile = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "PowerShell\Microsoft.PowerShell_profile.ps1"
      Install-LlangkkaProfile -ProfilePath $ps7Profile -Label "PowerShell 7"
    } else {
      Write-Warning "PowerShell 7(pwsh)이 설치되어 있지 않아 건너뜁니다."
    }
  }
}

Write-Host ""
Write-Host "다음 확인:" -ForegroundColor Cyan
Write-Host "  oh-my-posh --version   (프롬프트 테마)" -ForegroundColor Gray
Write-Host "  starship --version     (폴백 프롬프트)" -ForegroundColor Gray
Write-Host ""
Write-Host "두 셸 모두 설정하려면:" -ForegroundColor Cyan
Write-Host "  .\setup.ps1 -Both" -ForegroundColor Yellow
