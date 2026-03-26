param(
  [string]$TargetDir = "D:\RSTGameTranslation"
)

$ErrorActionPreference = "Stop"

$rstExe = Join-Path $TargetDir "rst.exe"
if (-not (Test-Path $rstExe)) {
  throw "rst.exe를 찾지 못했습니다: $rstExe"
}

Write-Host "Starting: $rstExe"
Start-Process -FilePath $rstExe

