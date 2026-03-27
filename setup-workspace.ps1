#Requires -Version 5.1
<#
.SYNOPSIS
  워크스페이스 표준 폴더 생성 (idempotent).
.DESCRIPTION
  신규 저장소·클론은 projects/ 아래에 두는 것을 권장합니다.
  이 스크립트는 폴더만 만듭니다. 시스템 전역 설정은 변경하지 않습니다.
#>
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot

$dirs = @(
    (Join-Path $Root 'projects'),
    (Join-Path $Root 'tools'),
    (Join-Path $Root '.tmp')
)

foreach ($d in $dirs) {
    if (-not (Test-Path -LiteralPath $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
        Write-Host "[ok] created: $d"
    } else {
        Write-Host "[skip] exists: $d"
    }
}

Write-Host ""
Write-Host "Next steps (see WORKSPACE.md for Korean details):"
Write-Host "  - New repos/clones: $($Root)\projects\<name>"
Write-Host "  - Shared scripts: $($Root)\tools"
Write-Host "  - Local scratch (do not commit): $($Root)\.tmp"
