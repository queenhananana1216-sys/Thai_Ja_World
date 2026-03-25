param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [int]$ItemsPerFeed = 8,
  [int]$Limit = 8
)

# 서버가 안 떠 있으면 자동으로 Next dev를 올려서
# 작업 스케줄러에서도 파이프라인이 실패하지 않게 합니다.
try {
  $u = [Uri]$BaseUrl
  $host = $u.Host
  $port = if ($u.Port) { $u.Port } else { 3000 }

  $npmCmd = "C:\Program Files\nodejs\npm.cmd"
  if (-not (Test-NetConnection -ComputerName $host -Port $port -InformationLevel Quiet)) {
    if (-not (Test-Path $npmCmd)) { throw "npm cmd not found: $npmCmd" }

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "cd `"$PSScriptRoot`"; & `"$npmCmd`" run dev"
    ) -WindowStyle Hidden | Out-Null

    Start-Sleep -Seconds 25
  }
} catch {
  Write-Host "Server reachability check/start warning: $($_.Exception.Message)"
}

# Ollama(11434)까지 자동으로 떠 있어야 로컬 요약이 됩니다.
try {
  $ollamaHost = "127.0.0.1"
  $ollamaPort = 11434
  if (-not (Test-NetConnection -ComputerName $ollamaHost -Port $ollamaPort -InformationLevel Quiet)) {
    $ollamaExe = $null
    $candidates = @(
      "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
      "C:\Users\langk\AppData\Local\Programs\Ollama\ollama.exe"
    )
    foreach ($c in $candidates) {
      if ($c -and (Test-Path $c)) { $ollamaExe = $c; break }
    }
    if (-not $ollamaExe) {
      throw "ollama.exe not found (LOCALAPPDATA/Ollama 폴더 또는 C:\\Users\\langk\\AppData\\Local\\Programs\\Ollama 경로 확인 필요)"
    }

    Start-Process -FilePath $ollamaExe -ArgumentList @("serve") -WindowStyle Hidden | Out-Null
    # 서버가 뜰 때까지 짧게 대기
    Start-Sleep -Seconds 8
  }
} catch {
  Write-Host "Ollama reachability check/start warning: $($_.Exception.Message)"
}

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
