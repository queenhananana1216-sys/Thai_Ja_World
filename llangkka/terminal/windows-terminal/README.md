# Windows Terminal 프로필 추가(옵션)

이 프로젝트는 “프로필 추가”를 실제로는 자동 수정하지 않고, 템플릿만 제공합니다.

## 1) 템플릿 확인

- `settings.template.json` : `llangkka PowerShell 7`, `llangkka Ubuntu` 프로필 2개 정의

PowerShell 7 경로(`C:\Program Files\PowerShell\7\pwsh.exe`)가 본인 PC와 다르면 템플릿의 `commandline`만 맞춰 주세요.

## 2) 적용 방법(선택 1)

- Cursor/터미널에서 Windows Terminal `settings.json`을 열고,
- `settings.template.json`의 `profiles.list` 항목을 본인 `profiles.list`에 추가

## 3) 적용 방법(선택 2)

- `apply-profiles.ps1` : 현재 `settings.json`을 찾아서, 템플릿 프로필(동일 `guid`가 없을 때만)만 병합

