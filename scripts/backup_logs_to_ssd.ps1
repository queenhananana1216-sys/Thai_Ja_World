# 태자 월드 — Supabase 로그성 테이블을 로컬 디스크(예: SSD)에 JSON으로 백업
#
# 사용법:
#   1) PowerShell 에서 이 폴더로 이동 후 실행
#   2) 환경 변수 설정 (또는 같은 폴더의 .env.backup — 아래 수동 로드)
#
#   $env:NEXT_PUBLIC_SUPABASE_URL = "https://xxx.supabase.co"
#   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
#   .\backup_logs_to_ssd.ps1 -OutRoot "E:\Backup\thaijaworld"
#
# 주의: SERVICE_ROLE 키는 절대 Git 에 올리지 말 것. 이 스크립트만 공유.

param(
  [string]$OutRoot = "E:\Backup\thaijaworld",
  [int]$MaxRowsPerTable = 5000
)

$ErrorActionPreference = "Stop"
$day = Get-Date -Format "yyyy-MM-dd"
$dest = Join-Path $OutRoot $day
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$base = $env:NEXT_PUBLIC_SUPABASE_URL?.TrimEnd('/')
$key = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $base -or -not $key) {
  Write-Error "NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요."
}

$headers = @{
  apikey        = $key
  Authorization = "Bearer $key"
  Accept        = "application/json"
}

function Export-Table {
  param([string]$Table, [string]$OrderColumn = "created_at")
  $uri = "$base/rest/v1/$Table?select=*&order=$OrderColumn.desc&limit=$MaxRowsPerTable"
  try {
    $rows = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    $path = Join-Path $dest "$Table.json"
    $rows | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8
    Write-Host "OK $Table -> $path ($($rows.Count) rows)"
  } catch {
    Write-Warning "$Table : $($_.Exception.Message)"
  }
}

# 로그·운영 추적 중심 (필요 시 테이블 추가)
Export-Table -Table "bot_actions"
Export-Table -Table "reports"
Export-Table -Table "publish_logs" -OrderColumn "published_at"

Write-Host "Done. Backup folder: $dest"
