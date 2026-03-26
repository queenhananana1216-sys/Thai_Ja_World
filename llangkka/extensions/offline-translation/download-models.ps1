# llangkka offline translation packages download/install (Windows PowerShell 7)
# - 인터넷이 있을 때 1회 실행
# - 오프라인에서는 이미 설치된 패키지만 사용됩니다.

$ErrorActionPreference = "Stop"

$llangkkaRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$packagesDir = if ([string]::IsNullOrWhiteSpace($env:LLANGKKA_DATA_ROOT)) {
  Join-Path $llangkkaRoot "extensions\\offline-translation\\data\\packages"
} else {
  Join-Path $env:LLANGKKA_DATA_ROOT "offline-translation\\packages"
}
$env:ARGOS_PACKAGES_DIR = $packagesDir

New-Item -ItemType Directory -Force -Path $packagesDir | Out-Null

$langOrderPath = Join-Path $llangkkaRoot "extensions\\offline-translation\\lang-order.json"
$langOrder = Get-Content -Raw -Path $langOrderPath | ConvertFrom-Json

$pairs = @(
  @{ from = "th"; to = "ko" },
  @{ from = "en"; to = "ko" }
)

$offlineMode = ($env:LLANGKKA_OFFLINE -eq "1")

if (-not (Get-Command argospm -ErrorAction SilentlyContinue)) {
  throw "argospm 을 찾을 수 없습니다. 먼저 setup.ps1을 실행해서 argostranslate를 설치해주세요."
}

if (-not $offlineMode) {
  Write-Host "argospm update (인터넷 필요) ... "
  & argospm update
}
else {
  Write-Host "LLANGKKA_OFFLINE=1 이므로 update는 건너뜁니다."
}

foreach ($pair in $pairs) {
  $from = $pair.from
  $to = $pair.to
  Write-Host "검색/설치 대상: $from -> $to"

  # argospm search 결과에서 translate-... 패키지명을 추출
  $searchOut = & argospm search --from-lang $from --to-lang $to 2>&1
  if (-not $searchOut) {
    throw "argospm search 결과가 없습니다: $from -> $to"
  }

  $packageIds = @()
  foreach ($line in $searchOut) {
    # 예: translate-th_ko: Thai->Korean (quality info...)
    if ($line -match '(translate-[^:\s]+)\s*:') {
      $packageIds += $Matches[1]
    }
  }

  if (-not $packageIds -or $packageIds.Count -eq 0) {
    throw "패키지 id를 추출하지 못했습니다. argospm search 출력 확인 필요: $from -> $to"
  }

  $installAll = ($env:LLANGKKA_TRANSLATION_INSTALL_ALL -eq "1")
  if (-not $installAll) {
    $packageIds = @($packageIds[0])
  }

  foreach ($pid in $packageIds) {
    Write-Host "설치 시도: $pid"
  try {
      & argospm install $pid
  } catch {
      Write-Warning "설치 실패(이미 설치일 수 있음): $pid"
  }
  }
}

Write-Host "완료: 태국/영어 번역 패키지 설치(또는 재시도) 완료"

