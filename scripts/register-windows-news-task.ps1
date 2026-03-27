# 매일 로컬 PC에서 뉴스 수집·처리 (작업 스케줄러)
# 사용: powershell -ExecutionPolicy Bypass -File scripts\register-windows-news-task.ps1
# 선택: -Time "06:00" -TaskName "ThaiJaWorld-NewsIngest"

param(
  [string]$Time = "06:00",
  [string]$TaskName = "ThaiJaWorld-NewsIngest"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tr = Join-Path $root "scripts\run-news-ingest.cmd"

if (-not (Test-Path $tr)) {
  throw "not found: $tr"
}

# /ST 는 24시간 HH:mm (로컬 시간). /SC DAILY 매일.
schtasks /Create /F /TN $TaskName /TR "`"$tr`"" /SC DAILY /ST $Time /RL LIMITED | Write-Host
Write-Host "등록됨: 작업 스케줄러 → '$TaskName' 매일 $Time"
