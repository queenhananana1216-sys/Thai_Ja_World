# llangkka: 자연어(한국어 등) -> PowerShell 명령 1줄 생성 (Ollama)
# 사용: nl 현재 폴더에 있는 txt 파일 목록만 보여줘
# 자동 실행: $env:LLANGKKA_NL_AUTO = "1"

function script:Invoke-LlangkkaNlCleanLine {
  param([string]$Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) { return "" }
  $t = $Raw.Trim()
  if ($t -match '(?s)```(?:powershell|pwsh|ps1|shell)?\s*\r?\n(.*?)```') {
    $t = $Matches[1].Trim()
  } elseif ($t -match '(?s)```\s*\r?\n(.*?)```') {
    $t = $Matches[1].Trim()
  }
  $lines = $t -split "`r?`n"
  foreach ($l in $lines) {
    $trimmed = $l.Trim()
    if ($trimmed -ne "" -and $trimmed -notmatch '^\s*#') { return $trimmed }
  }
  return ""
}

function nl {
  param(
    [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
    [string[]]$QueryParts
  )
  $query = ($QueryParts -join " ").Trim()
  if (-not $query) {
    Write-Host "Usage: nl <natural language request>" -ForegroundColor Yellow
    return
  }

  if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Error "ollama not found."
    return
  }

  $model = $env:LLANGKKA_OLLAMA_MODEL
  if ([string]::IsNullOrWhiteSpace($model)) { $model = "qwen2.5:7b" }

  $nl = [Environment]::NewLine
  $sys = "You are a Windows PowerShell expert. The user requests in Korean or natural language." + $nl
  $sys += "Rules:" + $nl
  $sys += "1) Output ONLY the single PowerShell command to run. No whitespace before/after." + $nl
  $sys += "2) No explanations, comments, markdown, code fences, or multiple lines." + $nl
  $sys += "3) Chain steps with pipe (|) or semicolon (;) into one line." + $nl
  $sys += "4) For dangerous requests (format disk, rm -rf /, etc), output only:" + $nl
  $sys += "Write-Host '[Refused] Unsafe request' -ForegroundColor Red"

  $prompt = $sys + $nl + $nl + "Request: " + $query
  $raw = & ollama run $model $prompt 2>$null | Out-String
  $cmd = Invoke-LlangkkaNlCleanLine $raw
  if ([string]::IsNullOrWhiteSpace($cmd)) {
    Write-Error "Failed to generate command."
    return
  }

  Write-Host ""
  Write-Host "[Suggested]" -ForegroundColor Cyan
  Write-Host $cmd -ForegroundColor Yellow

  if ($env:LLANGKKA_NL_AUTO -eq "1") {
    Invoke-Expression $cmd
    return
  }
  $ans = Read-Host "Run? (y/N)"
  if ($ans -eq "y" -or $ans -eq "Y") {
    Invoke-Expression $cmd
  }
}
