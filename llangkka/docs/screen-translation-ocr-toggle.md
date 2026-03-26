# 전체 화면 OCR/번역 토글 (옵션 B)

`RSTGameTranslation`을 SSD에 두고 실행한 뒤, 오버레이 표시와 번역 시작/정지를 빠르게 껐다 켤 수 있게 합니다.

## 1) SSD에 설치(다운로드/압축해제)

`D:\RSTGameTranslation`을 예로 합니다. 경로는 바꿔도 됩니다.

```powershell
cd e:\02_Workspace\llangkka
.\tools\screen-translation\download-rstgametranslation.ps1 -TargetDir "D:\RSTGameTranslation"
```

실행 확인:

```powershell
.\tools\screen-translation\run-rstgametranslation.ps1 -TargetDir "D:\RSTGameTranslation"
```

## 2) Ollama(로컬 AI) 연동 확인

RSTGameTranslation Settings에서 Translation 서비스를 `Ollama`로 선택한 뒤,
endpoint가 `http://127.0.0.1:11434` 인지 확인하세요.

Windows(호스트)에서 API가 되는지 확인:

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

또는 아래 체크 스크립트를 사용:

```powershell
.\tools\screen-translation\check-ollama-api.ps1
```

Ollama 모델명도 RST Settings에서 확인/설정해야 합니다.

예를 들어 `qwen2.5:7b` 같은 모델을 쓰려면(모델이 로컬에 없으면) 미리 받습니다:

```powershell
ollama pull qwen2.5:7b
```

## 3) 언어 방향(Profiles) 정리

RSTGameTranslation은 “원래 화면에 있는 언어(Source) -> 원하는 번역(Target)”을 앱 설정에 맞춥니다.

따라서 (자동 감지 없이) 가장 단순한 방식은 2개 모드만 만들어두고, 한글이 잡히면 `Alt+W`(Swap Languages)로 뒤집는 겁니다.

- Mode 1(기본): `en -> ko`
  - 한글이 보이면 `Alt+W`로 스왑 → `ko -> en`
- Mode 2: `th -> ko`
  - 한글이 보이면 `Alt+W`로 스왑 → `ko -> th`

이렇게 하면 “한글일 때 영어/태국어를 토글”하는 니즈를 `Alt+W` 하나로 처리할 수 있습니다.

## 4) 토글 단축키(오버레이/시작-중지)

`terminal\screen-translation\rst-toggle.ahk`:
- `F7` : `Alt+F` (Overlay on/off)
- `F8` : `Alt+G` (Start/Stop OCR/Translation)

이 스크립트는 `AutoHotkey`(v1.1 기준)가 필요합니다.

SSD에 RSTGameTranslation 폴더가 그대로 있으면, AHK 스크립트도 SSD/같은 위치에 두고 PC에서 실행하면 됩니다.

SSD로 옮긴 RST 폴더에 `rst.exe`를 실행한 상태에서 `F7/F8`를 눌러 토글이 되는지 확인하세요.

## 5) 사용 흐름(요약)

1. `rst.exe` 실행
2. Settings에서 OCR/Source/Target 및 Translation을 `Ollama`로 설정
3. `Alt+Q`로 화면(영역) 선택
4. `F7`/`F8`로 Overlay와 번역 시작/정지 토글

## 6) SSD/PC 교체 시 “그대로 쓰는” 체크리스트

- SSD에 포함할 것
  - `RSTGameTranslation` 폴더(예: `D:\RSTGameTranslation`)
  - `rst-toggle.ahk` (이 문서의 `terminal\screen-translation\rst-toggle.ahk` 파일)
- PC에 맞춰 매번 확인할 것
  - Windows에서 Ollama가 실행 중인지 (`http://127.0.0.1:11434`)
  - RST Settings의 Ollama endpoint/모델명이 맞는지
- 실행 순서
  - `rst.exe` 먼저 실행
  - `rst-toggle.ahk` 실행(또는 SSD에서 자동 실행)
  - `Alt+Q` → `F7/F8`로 토글

