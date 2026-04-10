# llangkka terminal profile (PowerShell 7 + Windows PowerShell 5.1 공용)

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$isPwsh7 = $PSVersionTable.PSVersion.Major -ge 7
$ESC = [char]27

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$starshipConfigPath = Join-Path $llangkkaRoot "terminal\common\starship.toml"
$langkaOmpPath = Join-Path $llangkkaRoot "terminal\prompts\langka.omp.json"

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
  $env:STARSHIP_CONFIG = $starshipConfigPath
}

# ── PSReadLine ────────────────────────────────────────────────────────────────
try {
  Import-Module PSReadLine -ErrorAction Stop | Out-Null

  Set-PSReadLineOption -EditMode Windows -HistorySearchCursorMovesToEnd:$true
  Set-PSReadLineOption -PredictionSource History

  $psrlColors = @{}
  if ($isPwsh7) {
    $psrlColors['InlinePrediction'] = "$ESC[38;5;246m"
    $psrlColors['Selection'] = "$ESC[48;5;237m"
    $psrlColors['Command'] = "$ESC[38;5;147m"
    $psrlColors['Parameter'] = "$ESC[38;5;152m"
    $psrlColors['String'] = "$ESC[38;5;222m"
    $psrlColors['Number'] = "$ESC[38;5;117m"
    $psrlColors['Operator'] = "$ESC[38;5;175m"
    $psrlColors['Comment'] = "$ESC[38;5;102m"
    $psrlColors['Keyword'] = "$ESC[38;5;177m"
    $psrlColors['Error'] = "$ESC[38;5;203m"
  } else {
    $psrlColors['InlinePrediction'] = [ConsoleColor]::DarkGray
    $psrlColors['Command'] = [ConsoleColor]::Cyan
    $psrlColors['Parameter'] = [ConsoleColor]::DarkCyan
    $psrlColors['String'] = [ConsoleColor]::Yellow
    $psrlColors['Number'] = [ConsoleColor]::White
    $psrlColors['Comment'] = [ConsoleColor]::DarkGray
    $psrlColors['Keyword'] = [ConsoleColor]::Magenta
    $psrlColors['Error'] = [ConsoleColor]::Red
  }
  try { Set-PSReadLineOption -Colors $psrlColors } catch { }

  try {
    Set-PSReadLineOption -PredictionViewStyle ListView
  } catch {
    try { Set-PSReadLineOption -PredictionViewStyle Inline } catch { }
  }

  try { Set-PSReadLineKeyHandler -Chord "Ctrl+r" -Function HistorySearchBackward } catch { }
  try { Set-PSReadLineKeyHandler -Chord "Ctrl+s" -Function HistorySearchForward } catch { }
  try { Set-PSReadLineKeyHandler -Chord "Tab" -Function MenuComplete } catch { }
  try { Set-PSReadLineKeyHandler -Chord "Ctrl+d" -Function DeleteCharOrExit } catch { }
} catch {
  # PSReadLine 미설치 또는 극히 오래된 버전
}

# ── Terminal-Icons ────────────────────────────────────────────────────────────
if (Get-Module -ListAvailable -Name Terminal-Icons) {
  Import-Module Terminal-Icons -ErrorAction SilentlyContinue
}

# ── 프롬프트: oh-my-posh 우선 → starship 폴백 → 미니 프롬프트 ──────────────
if (Test-Command -Name "oh-my-posh") {
  if (Test-Path $langkaOmpPath) {
    oh-my-posh init pwsh --config $langkaOmpPath | Invoke-Expression
  } else {
    oh-my-posh init pwsh | Invoke-Expression
  }
} elseif (Test-Command -Name "starship") {
  Invoke-Expression (&starship init powershell)
} else {
  function global:prompt {
    $exitCode = $LASTEXITCODE
    $cwd = (Get-Location).Path
    $leaf = Split-Path $cwd -Leaf
    if ($isPwsh7) {
      $purple = "$ESC[38;5;141m"
      $blue = "$ESC[38;5;111m"
      $green = "$ESC[38;5;114m"
      $red = "$ESC[38;5;203m"
      $reset = "$ESC[0m"
    } else {
      $purple = ""; $blue = ""; $green = ""; $red = ""; $reset = ""
    }
    $arrow = if ($exitCode -eq 0 -or $null -eq $exitCode) { "${green}>" } else { "${red}!" }
    return "${purple}langka ${blue}${leaf} ${arrow}${reset} "
  }
}

# ── 편의 함수 ─────────────────────────────────────────────────────────────────
function ll {
  if (Get-Command eza -ErrorAction SilentlyContinue) {
    & eza -la --group-directories-first --icons=auto --color=always $args
  } else {
    Get-ChildItem -Force $args
  }
}
function la {
  if (Get-Command eza -ErrorAction SilentlyContinue) {
    & eza -a --group-directories-first --icons=auto --color=always $args
  } else {
    Get-ChildItem -Force -Name $args
  }
}
function lt {
  if (Get-Command eza -ErrorAction SilentlyContinue) {
    & eza --tree --level=2 --icons=auto --color=always $args
  } else {
    Get-ChildItem -Recurse -Depth 1 $args
  }
}
function grep {
  param([Parameter(Mandatory = $true)][string]$Pattern, [string]$Path = ".")
  Select-String -Pattern $Pattern -Path $Path
}
function mkcd { param([string]$Dir); New-Item -ItemType Directory -Force -Path $Dir | Out-Null; Set-Location $Dir }

Set-Alias -Name cat -Value Get-Content -Force -ErrorAction SilentlyContinue

function llangkka-translate {
  $script = Join-Path $env:LLANGKKA_ROOT "extensions\offline-translation\translate.ps1"
  if (Test-Path $script) { & $script $args } else { Write-Warning "translate.ps1 not found: $script" }
}

function llangkka-gpt {
  $script = Join-Path $env:LLANGKKA_ROOT "extensions\offline-ai\gpt.ps1"
  if (Test-Path $script) { & $script -Prompt ($args -join ' ') } else { Write-Warning "gpt.ps1 not found: $script" }
}

function sysinfo {
  $purple = "$ESC[38;5;141m"; $blue = "$ESC[38;5;111m"; $reset = "$ESC[0m"
  if (-not $isPwsh7) { $purple = ""; $blue = ""; $reset = "" }
  Write-Host ""
  Write-Host "${purple}========== System Info ==========${reset}"
  Write-Host "${blue}OS      :${reset} $([System.Environment]::OSVersion.VersionString)"
  Write-Host "${blue}Host    :${reset} $env:COMPUTERNAME"
  Write-Host "${blue}User    :${reset} $env:USERNAME"
  Write-Host "${blue}Shell   :${reset} PowerShell $($PSVersionTable.PSVersion)"
  Write-Host "${blue}Uptime  :${reset} $([math]::Round((Get-CimInstance Win32_OperatingSystem).LastBootUpTime.Subtract([datetime]::Now).Negate().TotalHours, 1))h"
  Write-Host "${purple}=================================${reset}"
  Write-Host ""
}

$nlScript = Join-Path $llangkkaRoot "terminal\natural\nl.ps1"
if (Test-Path $nlScript) {
  . $nlScript
}

# ── 시작 배너 (간결하게, 명령 방해 없이) ─────────────────────────────────────
if ($isPwsh7) {
  $bPurple = "$ESC[38;5;141m"; $bSlate = "$ESC[38;5;246m"; $bReset = "$ESC[0m"
} else {
  $bPurple = ""; $bSlate = ""; $bReset = ""
}
$shellLabel = if ($isPwsh7) { "pwsh $($PSVersionTable.PSVersion)" } else { "PowerShell $($PSVersionTable.PSVersion)" }
Write-Host ""
Write-Host "${bPurple}  llangkka${bReset} ${bSlate}| ${shellLabel} | $(Get-Date -Format 'yyyy-MM-dd HH:mm')${bReset}"
Write-Host "${bSlate}  sysinfo, translate, gpt, nl <query>${bReset}"
Write-Host ""
