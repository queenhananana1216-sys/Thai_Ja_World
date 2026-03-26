$ErrorActionPreference = "Stop"

$Endpoint = $args[0]
if ([string]::IsNullOrWhiteSpace($Endpoint)) {
  $Endpoint = "http://127.0.0.1:11434"
}

$url = "$Endpoint/api/tags"
Write-Host "Checking: $url"

$resp = Invoke-RestMethod -Method Get -Uri $url -UserAgent "llangkka-rst-check"

if ($null -eq $resp) {
  throw "응답이 비어있습니다."
}

Write-Host "OK. tags:"
if ($resp.models) {
  $resp.models | Select-Object -First 20 name | ForEach-Object { Write-Host $_.name }
} else {
  $resp | ConvertTo-Json -Depth 3
}

