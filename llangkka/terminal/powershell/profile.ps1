# llangkka terminal profile (PowerShell 7)
# - history 검색/예측(PSReadLine) 중심
# - starship 프롬프트로 venv/conda 표시를 기본 숨김

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$starshipConfigPath = Join-Path $llangkkaRoot "terminal\common\starship.toml"
$langkaOmpPath = Join-Path $llangkkaRoot "terminal\prompts\langka.omp.json"

#
# llangkka 확장(오프라인 번역/오프라인 GPT)용 공통 경로를 환경변수로 노출
#
$env:LLANGKKA_ROOT = $llangkkaRoot
$env:ARGOS_PACKAGES_DIR = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\offline-translation\data\packages"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-translation\packages"
}
$env:OLLAMA_MODELS = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\offline-ai\data\models"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-ai\data\models"
}
if (-not $env:LLANGKKA_OLLAMA_MODEL) { $env:LLANGKKA_OLLAMA_MODEL = "qwen2.5:7b" }

if (Test-Path $starshipConfigPath) {
  # starship이 이 프로젝트 프롬프트 설정을 사용하도록 유도
  $env:STARSHIP_CONFIG = $starshipConfigPath
}

# PSReadLine: 히스토리 예측(아래 목록/ListView 또는 인라인 고스트 텍스트)
# - ListView: 입력 중 ↓(아래 화살표)로 후보 목록이 커서 아래에 펼쳐짐(터미널/PSReadLine 버전 필요)
# - ListView 미지원이면 Inline(같은 줄 회색 예측)로 자동 폴백
try {
  Import-Module PSReadLine -ErrorAction Stop | Out-Null

  Set-PSReadLineOption -EditMode Windows -HistorySearchCursorMovesToEnd:$true
  Set-PSReadLineOption -PredictionSource History
  try {
    Set-PSReadLineOption -Colors @{
      InlinePrediction = "`e[38;5;246m"
      Selection      = "`e[48;5;237m"
    }
  } catch { }

  try {
    Set-PSReadLineOption -PredictionViewStyle ListView
  } catch {
    Set-PSReadLineOption -PredictionViewStyle Inline
  }

  try {
    Set-PSReadLineKeyHandler -Chord "Ctrl+r" -Function HistorySearchBackward | Out-Null
  } catch { }
  try {
    Set-PSReadLineKeyHandler -Chord "Ctrl+s" -Function HistorySearchForward | Out-Null
  } catch { }
} catch {
  # PSReadLine 없음/버전 문제
}

# 목록 색/아이콘: Terminal-Icons 모듈이 있으면 Get-ChildItem이 폴더·파일 구분이 잘 보임
if (Get-Module -ListAvailable -Name Terminal-Icons) {
  Import-Module Terminal-Icons -ErrorAction SilentlyContinue
}

# 프롬프트: oh-my-posh(langka 커스텀 테마) 우선, 없으면 starship
if (Test-Command -Name "oh-my-posh") {
  if (Test-Path $langkaOmpPath) {
    oh-my-posh init pwsh --config $langkaOmpPath | Invoke-Expression
  } else {
    oh-my-posh init pwsh | Invoke-Expression
  }
} elseif (Test-Command -Name "starship") {
  Invoke-Expression (&starship init powershell)
}

# 자주 쓰는 별칭/함수(“편한 기능” 위주, 과한 커스텀은 피함)
function ll {
  if (Get-Command eza -ErrorAction SilentlyContinue) {
    & eza -la --group-directories-first --icons=auto --color=always @args
  } else {
    Get-ChildItem -Force @args
  }
}
function la {
  if (Get-Command eza -ErrorAction SilentlyContinue) {
    & eza -a --group-directories-first --icons=auto --color=always @args
  } else {
    Get-ChildItem -Force -Name @args
  }
}
function grep { param([Parameter(Mandatory = $true)][string]$Pattern, [string]$Path = "."); Select-String -Pattern $Pattern -Path $Path }

Set-Alias -Name cat -Value Get-Content -Force -ErrorAction SilentlyContinue

function llangkka-translate {
  $script = Join-Path $env:LLANGKKA_ROOT "extensions\\offline-translation\\translate.ps1"
  if (Test-Path $script) { & $script @args } else { throw "translate.ps1을 찾을 수 없습니다: $script" }
}

function llangkka-gpt {
  $script = Join-Path $env:LLANGKKA_ROOT "extensions\\offline-ai\\gpt.ps1"
  if (Test-Path $script) { & $script -Prompt (@args -join ' ') } else { throw "gpt.ps1을 찾을 수 없습니다: $script" }
}

# 자연어 -> 셸 명령 (Ollama, 실행 전 확인)
$nlScript = Join-Path $llangkkaRoot "terminal\natural\nl.ps1"
if (Test-Path $nlScript) {
  . $nlScript
}

