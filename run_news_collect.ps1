param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$ItemsPerFeed = 8
)

$serverUpChecked = $false
try {
  $u = [Uri]$BaseUrl
  $host = $u.Host
  $port = if ($u.Port) { $u.Port } else { 3000 }

  $npmCmd = "C:\Program Files\nodejs\npm.cmd"

  # 서버가 떠 있어야 API 호출이 성공합니다. (자동 작업이므로 안전장치 추가)
  if (-not (Test-NetConnection -ComputerName $host -Port $port -InformationLevel Quiet)) {
    Write-Host "Server not reachable ($($host):$port). Starting Next dev server..."

    # 이미 떠 있으면 굳이 중복 실행하면 안 되므로, 시작 직후 재확인합니다.
    if (-not (Test-Path $npmCmd)) {
      throw "npm cmd not found: $npmCmd"
    }

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "cd `"$PSScriptRoot`"; & `"$npmCmd`" run dev"
    ) -WindowStyle Hidden | Out-Null

    Start-Sleep -Seconds 25
  }
  $serverUpChecked = $true
} catch {
  Write-Host "Server reachability check/start warning: $($_.Exception.Message)"
}

$date = Get-Date -Format "yyyy-MM-dd"
# 24시간 중복 실행 방지용. 스케줄을 30분마다 돌려도 하루 1번만 success로 쌓이게 됨.
$idempotencyKey = "news_collect_daily-$date"

$uri = "$BaseUrl/api/bot/collect"
$body = @{
  idempotencyKey = $idempotencyKey
  itemsPerFeed = $ItemsPerFeed
}

try {
  $resp = Invoke-RestMethod `
    -Uri $uri `
    -Method POST `
    -ContentType "application/json" `
    -Body ($body | ConvertTo-Json -Compress) `
    -TimeoutSec 120

  Write-Host "OK: $($resp.status) run_id=$($resp.run_id)"
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
  throw
}

