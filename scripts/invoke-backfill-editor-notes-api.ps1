# Windows PowerShell — 배포된 사이트에 편집실 백필 API 호출
# 사용 전: $BaseUrl 에 실제 도메인을 넣고, CRON_SECRET 을 환경변수 또는 아래에 설정
#
# 예:
#   $env:CRON_SECRET = "vercel에_넣은_값"
#   .\scripts\invoke-backfill-editor-notes-api.ps1
#
# 또는 한 줄:
#   $env:CRON_SECRET="..."; $BaseUrl="https://your-domain.com"; .\scripts\invoke-backfill-editor-notes-api.ps1

param(
  [string]$BaseUrl = $env:BACKFILL_API_BASE_URL,
  [int]$Days = 7,
  [int]$Limit = 40
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  Write-Error "BaseUrl 이 비었습니다. 예: `$BaseUrl='https://태자도메인.com' 또는 환경변수 BACKFILL_API_BASE_URL"
}

$secret = $env:CRON_SECRET
if ([string]::IsNullOrWhiteSpace($secret)) { $secret = $env:BOT_CRON_SECRET }
if ([string]::IsNullOrWhiteSpace($secret)) {
  Write-Error "CRON_SECRET 또는 BOT_CRON_SECRET 환경변수를 설정하세요 (Vercel과 동일한 값)."
}

$uri = ($BaseUrl.TrimEnd('/') + '/api/bot/backfill-editor-notes')
$bodyObj = @{ days = $Days; limit = $Limit }
$json = $bodyObj | ConvertTo-Json -Compress

Write-Host "POST $uri"
$result = Invoke-RestMethod -Uri $uri -Method Post `
  -Headers @{
    Authorization = "Bearer $secret"
    'Content-Type' = 'application/json'
  } -Body $json

$result | ConvertTo-Json -Depth 8
