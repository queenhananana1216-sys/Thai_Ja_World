# llangkka offline translation setup (Windows PowerShell 7)
# - argostranslate / argos-translate (python cli) 설치
# - 오프라인 모델 패키지는 data/packages 에 고정하려는 구조(환경변수 우선)

$ErrorActionPreference = "Stop"

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# 외장 메모리 루트를 쓰려면 LLANGKKA_DATA_ROOT 를 설정하세요.
if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  $packagesDir = Join-Path $llangkkaRoot "extensions\\offline-translation\\data\\packages"
} else {
  $packagesDir = Join-Path $env:LLANGKKA_DATA_ROOT "offline-translation\\packages"
}

New-Item -ItemType Directory -Force -Path $packagesDir | Out-Null

# Argos Translate 패키지 저장 위치(지원되지 않는 경우 기본 위치에 설치될 수 있습니다.)
$env:ARGOS_PACKAGES_DIR = $packagesDir

# Python 패키지 설치
function Ensure-Python {
  if (Get-Command python -ErrorAction SilentlyContinue) { return }
  if (Get-Command py -ErrorAction SilentlyContinue) { return }
  throw "python/py 를 찾을 수 없습니다. WIndows에 Python 3.x 를 설치해주세요."
}

Ensure-Python

Write-Host "Python/패키지 설치를 시도합니다..."

$pyCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py -3" }

& $pyCmd -m pip install --upgrade pip | Out-Null
& $pyCmd -m pip install --upgrade argostranslate | Out-Null

Write-Host "완료: argostranslate 설치 완료."
Write-Host "다음: download-models.ps1 (인터넷 가능할 때 1회 실행 권장)"

