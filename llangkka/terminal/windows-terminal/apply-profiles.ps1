# llangkka Windows Terminal profiles 병합
# - settings.json 위치를 찾아 템플릿 프로필을 guid 기준으로 추가
# - 사용자의 기존 설정은 유지(프로필 중복이면 스킵)

$ErrorActionPreference = "Stop"

$templatePath = Join-Path $PSScriptRoot "settings.template.json"

if (!(Test-Path $templatePath)) {
  throw "템플릿을 찾을 수 없습니다: $templatePath"
}

$candidates = @(
  "$env:LOCALAPPDATA\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json",
  "$env:LOCALAPPDATA\\Microsoft\\Windows Terminal\\settings.json",
  "$env:LOCALAPPDATA\\Microsoft\\Windows Terminal Preview\\settings.json"
)

$settingsPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $settingsPath) {
  throw "Windows Terminal settings.json을 찾지 못했습니다. 수동 적용을 권장합니다."
}

$settingsRaw = Get-Content -Path $settingsPath -Raw -ErrorAction Stop
$settings = $settingsRaw | ConvertFrom-Json

$templateRaw = Get-Content -Path $templatePath -Raw -ErrorAction Stop
$template = $templateRaw | ConvertFrom-Json

if (-not $settings.profiles) { $settings | Add-Member -MemberType NoteProperty -Name profiles -Value @{ list = @(); defaults = @{} } }
if (-not $settings.profiles.list) { $settings.profiles.list = @() }
if (-not $template.profiles.list) { throw "템플릿에 profiles.list가 없습니다." }

$existingGuids = @{}
foreach ($p in $settings.profiles.list) {
  if ($p.guid) { $existingGuids[$p.guid] = $true }
}

$added = 0
foreach ($p in $template.profiles.list) {
  if (-not $p.guid) { continue }
  if ($existingGuids.ContainsKey($p.guid)) { continue }
  $settings.profiles.list += $p
  $existingGuids[$p.guid] = $true
  $added++
}

Write-Host "추가된 프로필 수: $added"

$json = $settings | ConvertTo-Json -Depth 64
$json | Set-Content -Path $settingsPath -Encoding UTF8
Write-Host "완료: $settingsPath"

