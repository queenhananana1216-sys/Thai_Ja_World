param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [int]$ItemsPerFeed = 8,
  [int]$Limit = 8
)

# Vercel / .env.local 의 CRON_SECRET(또는 BOT_CRON_SECRET)과 동일하면 Authorization 헤더를 붙입니다.
$headers = @{ "Content-Type" = "application/json" }
$secret = $env:CRON_SECRET
if (-not $secret) { $secret = $env:BOT_CRON_SECRET }
if ($secret) {
  $headers["Authorization"] = "Bearer $secret"
}

$uri = "$BaseUrl/api/bot/news-pipeline"
$body = @{
  itemsPerFeed = $ItemsPerFeed
  limit        = $Limit
} | ConvertTo-Json -Compress

try {
  $resp = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body -TimeoutSec 300
  Write-Host "pipeline status=$($resp.status)"
  Write-Host "collect: skipped=$($resp.collect.skipped) success=$($resp.collect.success)"
  Write-Host "process: skipped=$($resp.process.skipped) success=$($resp.process.success)"
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
  throw
}
