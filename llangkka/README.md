# llangkka

`llangkka`는 다음 목적의 로컬(SSD) 워크스페이스 프로젝트입니다.

- PowerShell 7 + WSL(Ubuntu) 터미널을 “빠르고 편한 히스토리/프롬프트” 중심으로 커스텀
- 가상환경(venv/conda)이 프롬프트에 표시되는 모듈은 기본적으로 숨김(원하면 켤 수 있게 설계)
- 확장: SSD에 오프라인 GPT/번역 및 언어 데이터(특정 국가 글자) 캐시를 받아 네트워크가 없어도 동작하도록 구조 마련

## 터미널 커스텀(먼저)

1. Windows에서 PowerShell 7을 쓰고 있다면 `terminal\powershell\setup.ps1` 실행
2. WSL(Ubuntu)에서 `terminal\wsl\ubuntu\setup.sh` 실행
3. Windows Terminal은 `terminal\windows-terminal\settings.template.json`을 기준으로 프로필을 추가(기존 설정은 유지)

## 오프라인 확장(다음 단계)

- `extensions\offline-ai` : 로컬 LLM(예: Ollama/llama.cpp 계열) 다운로드/캐시 구조
- `extensions\offline-translation` : 오프라인 번역(예: Argos Translate 계열) 데이터 캐시 구조

## 화면 번역(옵션 B, 초간단)

- 한글만 보고 쓰려면: `docs\screen-translation-simple-ko.md`
- 모드 안내 스크립트: `tools\screen-translation\screen-translate-modes.ps1`
- 상세(RST·Ollama·SSD): `docs\screen-translation-ocr-toggle.md`

## A 환경 — 로컬 전용(외부로 번역 텍스트 안 보내기)

- 가이드: `docs\local-only-privacy-setup-ko.md`
- 세션 적용: `tools\local-only\apply-session-local-only.ps1`
- 점검: `tools\local-only\verify-a-environment.ps1`

