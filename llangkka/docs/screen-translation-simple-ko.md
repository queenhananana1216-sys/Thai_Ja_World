# 화면 번역 — 초간단 한글 가이드

**민감한 내용은 외부로 안 나가게** 쓰려면 먼저 [local-only-privacy-setup-ko.md](local-only-privacy-setup-ko.md) (A 환경)을 보세요.

RSTGameTranslation 하나로 **오프라인(데이터 없음)** / **온라인(데이터 있음)** 모두 같은 방식으로 켜고 끌 수 있습니다.  
차이는 **번역 엔진 설정 한 번**뿐입니다.

## 한 장 요약: 무엇이 같고 무엇이 다른가

| 구분 | 번역 엔진 (RST Settings → Translation) | 켜기 / 끄기 |
|------|----------------------------------------|-------------|
| **데이터 없음 (오프라인)** | `Ollama` + `http://127.0.0.1:11434` + 모델명 | 아래 표 참고 |
| **데이터 있음 (온라인)** | `Google Translate` 등 (RST에서 선택) | 아래 표와 **동일** |

**전체 창**과 **일부만(레이어/영역)**도 같은 프로그램입니다.  
차이는 **`Alt+Q`로 잡는 사각형 크기**만 다릅니다.

## 켜기 / 끄기 (전부 이것만 기억)

| 하고 싶은 것 | 동작 |
|--------------|------|
| **번역 시작 / 멈춤** | `F8` (AutoHotkey 켠 경우) 또는 `Alt+G` |
| **오버레이(번역 글자) 보이기 / 숨기기** | `F7` 또는 `Alt+F` |
| **화면에서 번역할 구역 정하기** | `Alt+Q` → 마우스로 사각형 드래그 |
| **영어↔한글 / 태국어↔한글 방향 뒤집기** | `Alt+W` (Swap) |

- **전체 창만 번역**: `Alt+Q`로 **그 창 안을 꽉 채우게** 드래그한 뒤 `F8`로 시작.
- **선택한 영역만 번역**: `Alt+Q`로 **작은 박스**만 드래그한 뒤 `F8`로 시작.
- **끄기**: `F8`으로 번역 멈춤, 필요하면 `F7`으로 오버레이도 끔.

## 처음 한 번만 (순서대로)

1. SSD 등에 RST 설치 후 `rst.exe` 실행  
   (`tools\screen-translation\download-rstgametranslation.ps1` 참고)
2. **Settings → Translation**
   - 오프라인: `Ollama`, 주소 `http://127.0.0.1:11434`, 모델 선택
   - 온라인: `Google Translate` 등
3. **Settings → OCR**: `Windows OCR` 또는 `OneOCR` (가이드에 맞게)
4. **Settings → Language**:  
   - 태→한 / 영→한: Source `th` 또는 `en`, Target `ko`  
   - 한→태 / 한→영: 화면이 한글이면 `Alt+W`로 스왑하거나 Source/Target을 바꿈
5. 번역할 **창** 선택(앱에 있는 Select Window 등) 후 `Alt+Q` → `F7` → `F8`

## 더 편한 단축키 (선택)

`terminal\screen-translation\rst-toggle.ahk` 실행 → `rst.exe`가 켜진 상태에서 `F7`/`F8`.

## 모드 안내만 보고 싶을 때

PowerShell에서 (llangkka 루트 기준):

```powershell
.\tools\screen-translation\screen-translate-modes.ps1 -Network Offline -Scope FullWindow
.\tools\screen-translation\screen-translate-modes.ps1 -Network Online  -Scope SelectedRegion
```

`-StartRst`를 붙이면 `rst.exe`까지 실행합니다.

## 솔직한 한계

- Windows가 **화면의 글자를 직접 읽어오는 OCR**이 필요합니다. 그래서 “브라우저만”이 아니라 **RST 같은 프로그램**이 들어갑니다.
- **진짜로 화면의 모든 앱 글자를 OS가 자동으로 바꿔 치기**는 별도 시스템 훅 수준이라, 지금 구조는 **선택 영역(또는 창 크기 영역) + 오버레이**가 현실적인 타협입니다.
