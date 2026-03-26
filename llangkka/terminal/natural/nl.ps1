# llangkka: 자연어(한국어 등) -> PowerShell 7 명령 1줄 생성 (Ollama)
# 사용: nl 현재 폴더에 있는 txt 파일 목록만 보여줘
# 자동 실행: $env:LLANGKKA_NL_AUTO = "1" (위험하니 기본은 확인 프롬프트)

function script:Invoke-LlangkkaNlCleanLine {
  param([string]$Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) { return "" }
  $t = $Raw.Trim()
  if ($t -match '(?s)```(?:powershell|pwsh|ps1|shell)?\s*\r?\n(.*?)```') {
    $t = $Matches[1].Trim()
  } elseif ($t -match '(?s)```\s*\r?\n(.*?)```') {
    $t = $Matches[1].Trim()
  }
  $line = ($t -split "`r?`n" | Where-Object { $_.Trim() -ne "" -and $_.Trim() -notmatch '^\s*#' } | Select-Object -First 1)
  if ($null -eq $line) { return "" }
  return $line.Trim()
}

function nl {
  param(
    [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
    [string[]]$QueryParts
  )
  $query = ($QueryParts -join " ").Trim()
  if (-not $query) {
    Write-Host "사용법: nl <자연어 요청>" -ForegroundColor Yellow
    Write-Host '예: nl 현재 폴더 용량 큰 파일 위에서 5개만 보여줘' -ForegroundColor Gray
    return
  }

  if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Error "ollama가 없습니다. Ollama 설치 후 모델을 받아주세요."
    return
  }

  $model = $env:LLANGKKA_OLLAMA_MODEL
  if ([string]::IsNullOrWhiteSpace($model)) { $model = "qwen2.5:7b" }

  $sys = @'
당신은 Windows PowerShell 7 전문가다. 사용자는 한국어 또는 자연어로 요청한다.
규칙:
1) 출력은 반드시 실행할 PowerShell 명령 "한 줄"만. 앞뒤 공백 없이.
2) 설명, 주석, 마크다운, 코드펜스(```), 여러 줄 금지.
3) 여러 단계면 파이프(|) 또는 세미콜론(;)으로 한 줄로 합친다.
4) 위험한 요청(디스크 포맷, 시스템 파괴, 무차별 삭제 rm -rf / 등)이면 한 줄만:
Write-Host '[거부됨] 안전하지 않은 요청입니다' -ForegroundColor Red
'@

  $prompt = $sys + "`n`n요청: " + $query
  $raw = & ollama run $model $prompt 2>$null | Out-String
  $cmd = Invoke-LlangkkaNlCleanLine $raw
  if ([string]::IsNullOrWhiteSpace($cmd)) {
    Write-Error "명령을 생성하지 못했습니다. ollama 출력을 확인하세요."
    return
  }

  Write-Host ""
  Write-Host "[제안 명령]" -ForegroundColor Cyan
  Write-Host $cmd -ForegroundColor Yellow

  if ($env:LLANGKKA_NL_AUTO -eq "1") {
    Invoke-Expression $cmd
    return
  }
  $ans = Read-Host "실행할까요? (y/N)"
  if ($ans -eq "y" -or $ans -eq "Y") {
    Invoke-Expression $cmd
  }
}
