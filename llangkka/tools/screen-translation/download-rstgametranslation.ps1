param(
  [string]$TargetDir = "D:\RSTGameTranslation",
  [string]$ReleaseTag = "",  # 예: "V4.8" (비워두면 latest)
  [switch]$ForceDownload
)

$ErrorActionPreference = "Stop"

function Get-RstAssetUrl {
  param(
    [Parameter(Mandatory=$true)][string]$ApiUrl
  )

  $release = Invoke-RestMethod -Method Get -Uri $ApiUrl -UserAgent "llangkka-rst-installer"
  $zipAsset = $release.assets | Where-Object { $_.name -match '\.zip$' } | Select-Object -First 1
  if (-not $zipAsset) {
    throw "릴리즈 zip asset을 찾지 못했습니다. ApiUrl=$ApiUrl"
  }
  return $zipAsset.browser_download_url
}

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
  throw "TargetDir가 비어있습니다."
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

$zipPath = Join-Path $TargetDir "RSTGameTranslation.zip"

$apiUrl = if ([string]::IsNullOrWhiteSpace($ReleaseTag)) {
  "https://api.github.com/repos/thanhkeke97/RSTGameTranslation/releases/latest"
} else {
  "https://api.github.com/repos/thanhkeke97/RSTGameTranslation/releases/tags/$ReleaseTag"
}

if ($ForceDownload -or -not (Test-Path $zipPath)) {
  $assetUrl = Get-RstAssetUrl -ApiUrl $apiUrl
  Write-Host "Downloading: $assetUrl"
  Invoke-WebRequest -Uri $assetUrl -OutFile $zipPath -UseBasicParsing
} else {
  Write-Host "기존 zip이 있습니다. 다운로드 스킵: $zipPath"
}

Write-Host "Extracting to: $TargetDir"

# zip 내부에 폴더가 있을 수 있으니 덮어쓰기/정리 전략을 단순화합니다.
# - 사용자가 SSD에 커스텀한 파일이 있으면, 추출 전에 백업하는 걸 권장합니다.
Expand-Archive -Path $zipPath -DestinationPath $TargetDir -Force

Write-Host "Done."
Write-Host "다음: $TargetDir\rst.exe 실행"

