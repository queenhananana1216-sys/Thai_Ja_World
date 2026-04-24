<#
.SYNOPSIS
  오프라인/온라인 × 전체 창 / 선택 영역 — 화면 번역 사용법만 한글로 출력하고, 필요 시 rst.exe 실행.

.DESCRIPTION
  RSTGameTranslation 설정이 헷갈릴 때, "지금 어떤 조합인지"와 켜기/끄기 키만 보여 줍니다.
  전체 창 = Alt+Q로 그 창을 꽉 채우게 영역 지정.
  선택 영역 = Alt+Q로 작은 사각형만 지정.

.EXAMPLE
  .\screen-translate-modes.ps1 -Network Offline -Scope FullWindow -StartRst
  .\screen-translate-modes.ps1 -Network Online -Scope SelectedRegion
#>

param(
  [ValidateSet("Offline", "Online")]
  [string]$Network = "Offline",

  [ValidateSet("FullWindow", "SelectedRegion")]
  [string]$Scope = "FullWindow",

  [string]$RstDir = "D:\RSTGameTranslation",

  [switch]$StartRst
)

$ErrorActionPreference = "Stop"

try {
  if ($null -ne [Console]::OutputEncoding) {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  }
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

$rstExe = Join-Path $RstDir "rst.exe"

$translationHint = if ($Network -eq "Offline") {
  @"
  [번역 엔진] RST → Settings → Translation → Ollama
  - 주소: http://127.0.0.1:11434
  - 모델: (예) qwen2.5:7b — 없으면: ollama pull qwen2.5:7b
  - API 확인: .\check-ollama-api.ps1
"@
} else {
  @"
  [번역 엔진] RST → Settings → Translation → Google Translate (또는 RST에 있는 온라인 서비스)
  - 인터넷 연결 필요
"@
}

$scopeHint = if ($Scope -eq "FullWindow") {
  @"
  [영역] "전체 창"처럼 쓰려면
  - Alt+Q 를 누른 뒤, 번역하고 싶은 창 안을 마우스로 크게 드래그해 창을 꽉 채우세요.
  - 같은 프로그램이므로 "레이어만"과 차이는 사각형 크기뿐입니다.
"@
} else {
  @"
  [영역] "선택한 부분만"
  - Alt+Q 로 번역할 텍스트가 있는 작은 영역만 드래그하세요.
  - 여러 군데면 RST에서 멀티 영역 옵션을 켠 뒤 Alt+Q 를 여러 번(앱 가이드 참고).
"@
}

$banner = @"

========================================
  llangkka 화면 번역 — 선택한 모드 안내
========================================

  네트워크: $Network
  범위:     $Scope

$translationHint

$scopeHint

  [언어] 태→한 / 영→한: Source = th 또는 en, Target = ko
         한→태 / 한→영: 화면이 한글이면 Alt+W (Swap) 또는 Source/Target 수동 변경

  [켜기/끄기]
  - 번역 시작/정지:  Alt+G  (AutoHotkey: F8)
  - 오버레이 on/off: Alt+F  (AutoHotkey: F7)
  - 영역 다시 잡기:  Alt+Q

  자세한 한글 설명: docs\screen-translation-simple-ko.md
========================================

"@

Write-Host $banner

$notePath = Join-Path $env:TEMP "llangkka-screen-translate-mode.txt"
Set-Content -Path $notePath -Value $banner -Encoding UTF8
Write-Host "이 안내를 파일로도 저장했습니다: $notePath"

if ($StartRst) {
  if (-not (Test-Path $rstExe)) {
    Write-Error "rst.exe를 찾을 수 없습니다: $rstExe`n먼저 download-rstgametranslation.ps1 로 설치하거나 -RstDir 경로를 맞추세요."
  }
  Write-Host "실행: $rstExe"
  Start-Process -FilePath $rstExe
}
