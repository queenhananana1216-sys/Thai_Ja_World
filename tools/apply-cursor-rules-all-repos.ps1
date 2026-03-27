#Requires -Version 5.1
<#
.SYNOPSIS
  지정 드라이브에서 Git 저장소 루트를 찾아 Cursor 규칙(.cursor/rules/*.mdc)을 동일하게 배포합니다.
.NOTES
  node_modules 등 무거운 폴더는 들어가지 않습니다. .git이 보이면 그 디렉터리는 저장소 루트로만 처리하고 하위는 스캔하지 않습니다.
#>
param(
    [string[]]$Roots = @('E:\'),
    [int]$MaxDepth = 24
)

$ErrorActionPreference = 'Continue'

$RuleFiles = @{
    'terminal-communication.mdc' = @'
---
description: 터미널·에러는 한국어로 짧게 풀고, 실행할 명령·경로는 터미널과 동일한 원문을 복붙 전용 코드 블록으로 준다. 가능하면 먼저 실행·검증한다.
alwaysApply: true
---

# 터미널·에러 설명 방식 (한·영 혼용 + 복붙 명령)

## 무엇은 영어(원문)로 둘까

- **폴더·파일 경로**, **실행 파일·패키지 이름**, **사용자가 터미널에 그대로 붙여넣을 명령**은 터미널과 **글자 하나까지 동일**하게 적는다.
- IDE·탐색기와 **대조해 의도를 추적**할 수 있게 한다. 경로나 명령을 한글로만 풀어서 대체하지 않는다.

## 무엇은 한국어로 풀까

- 에러가 **무슨 뜻인지**를 **아주 짧은 구어체**로 쓴다. (예: `asdf` 없다 → 설치해라 / 이건 하지 마라.)
- **왜 났는지(추정)**, **다음에 뭘 하면 되는지**도 한국어로 짧게. 로그가 길면 핵심 원문 한두 줄 인용 후 **「한 줄 요약」** · **「할 일」** 을 한국어로.

## 복붙만 하면 되게 (필수)

- 사용자가 **수정 없이 복사→터미널 붙여넣기→Enter**만 하면 되도록, **실제로 칠 명령 전체**를 마크다운 **코드 펜스** 안에 단독으로 넣는다. 한 블록에 한 줄(또는 연속으로 붙여넣을 수 있는 블록)만 넣어 혼동을 줄인다.
- PowerShell이면 **PowerShell용**으로, bash면 **bash용**으로 구분해 적고, **어느 폴더에서 실행하는지** 한 줄로 적는다 (예: `프로젝트 루트에서`).
- **하지 말아야 할 명령**이 있으면 한국어로 이유 한 줄 + (있다면) 대신 쓸 **복붙용 올바른 명령** 블록을 준다.

## 검증·의도 확인

- 파괴적이지 않고 안전하면 **에이전트가 먼저 실행**해 보고, 제시하는 복붙 명령과 실제 환경이 맞는지 확인한다.
- 실행 못 하면 **왜 못 돌려봤는지**와, 사용자가 로컬에서 쓸 **동일한 복붙 블록(영문 원문)** 을 준다.
- 답 끝에 **「지금 안내가 하려던 것과 맞는지」** 한 문장으로 확인하게 한다.

## 피할 것

- 「이런 식으로 설치하세요」처럼 **명령을 한글로만 설명**하고 정확한 CLI 문자열을 안 주기.
- 코드 블록 안에 **프롬프트 기호(`PS>`, `$`)나 주석을 섞어** 복붙 한 번에 안 되게 만들기. 필요하면 블록 밖에 설명.
- 에러 전체를 어색하게만 번역해 **의도가 더 흐려지게** 하기. 원문 일부는 남기고 한국어는 해설만 담당.
'@

    'workspace-isolation.mdc' = @'
---
description: 워크스페이스 경계·비밀 보호·중앙 볼트(E:\01_Master_Keys) 단일 원본. 시스템 전역 변경 금지.
alwaysApply: true
---

# 워크스페이스 격리·안전

## 범위

- 파일 생성·수정·삭제는 **Cursor에 열린 워크스페이스 루트와 그 하위**로만 한다.
- 워크스페이스 **밖** 경로에 대한 쓰기·삭제·설치(전역 패키지, 시스템 디렉터리)는 사용자가 **문장으로 명시적으로 요청한 경우에만** 수행한다.
- `C:\Windows`, `Program Files`, 사용자 홈 전체 스캔·변경, 레지스트리 광범위 수정은 기본적으로 하지 않는다.

## 중앙 자격 증명 볼트 (`E:\01_Master_Keys`)

- **단일 원본**: 패스키·비밀번호·API 키·토큰 등 민감 값의 **실제 보관**은 사용자 볼트 `E:\01_Master_Keys`에만 둔다고 가정한다. 각 프로젝트 트리에는 **동일 시크릿을 복제해 두지 않는다** (레포·백업·채팅 로그 유출 방지).
- **프로젝트는 참조만**: 앱·`.env.local`(커밋 제외)에는 볼트 **파일 경로·변수 이름·키 이름**만 두고, 값은 런타임에 볼트에서 읽게 한다.
- **에이전트와 볼트**: 사용자가 **볼트를 열었거나, 특정 키/파일을 읽어 달라고 명시하기 전**에는 볼트 내용을 통째로 읽거나 나열하지 않는다. 답변·로그·터미널 출력에 **시크릿 본문을 넣지 않는다** (마스킹·이름만).
- **검증 후 사용**: 자격 증명이 필요한 명령·스크립트는 **필요한 변수만** 로드하고, 사용자가 로컬에서 **이미 돌려본 흐름**을 우선한다.

## 비밀·자격증명 (일반)

- `.env`, `.env.local`, `.env.*.local`, 키·토큰·비밀번호를 **Git에 커밋하지 않는다**.
- 이슈·채팅에 시크릿을 붙이지 않는다. 필요 시 플레이스홀더만 쓴다.

## 실행 환경

- 터미널 명령은 **프로젝트 목적에 필요한 최소 범위**로만 실행한다.
- 의존성 설치는 해당 프로젝트 디렉터리에서 매니페스트가 있을 때만 하고, 전역 `npm install -g` 등은 사용자가 요청하지 않으면 하지 않는다.

## 다중 프로젝트·모노레포

- 여러 패키지가 있으면 **수정 중인 경로를 명확히** 하고, 무관한 `node_modules`·빌드 산출물은 건드리지 않는다.
'@
}

$SkipDirNames = [System.Collections.Generic.HashSet[string]]::new(
    [string[]]@(
        'node_modules', '.next', 'dist', 'build', 'out', 'target', '__pycache__', '.venv', 'venv',
        '$Recycle.Bin', 'System Volume Information', '.gradle', '.nuget', 'packages',
        'Pods', 'Carthage', '.turbo', '.cache', 'coverage', 'storybook-static'
    ),
    [StringComparer]::OrdinalIgnoreCase
)

$script:repos = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

function Test-ShouldSkipDir {
    param([string]$Name)
    if ([string]::IsNullOrEmpty($Name)) { return $true }
    if ($SkipDirNames.Contains($Name)) { return $true }
    return $false
}

function Find-GitRepos {
    param([string]$Dir, [int]$Depth)
    if ($Depth -gt $MaxDepth) { return }
    if (-not (Test-Path -LiteralPath $Dir -PathType Container)) { return }

    $gitPath = Join-Path $Dir '.git'
    if (Test-Path -LiteralPath $gitPath) {
        [void]$script:repos.Add($Dir)
        return
    }

    $children = Get-ChildItem -LiteralPath $Dir -Force -Directory -ErrorAction SilentlyContinue
    if ($null -eq $children) { return }

    foreach ($c in $children) {
        if (Test-ShouldSkipDir $c.Name) { continue }
        Find-GitRepos -Dir $c.FullName -Depth ($Depth + 1)
    }
}

foreach ($root in $Roots) {
    $r = $root.TrimEnd('\')
    if (-not (Test-Path -LiteralPath $r -PathType Container)) {
        Write-Warning "Skip missing path: $r"
        continue
    }
    Write-Host "Scanning for git repos under: $r (max depth $MaxDepth)"
    Find-GitRepos -Dir $r -Depth 0
}

$list = @($script:repos) | Sort-Object
Write-Host "Found $($list.Count) git repository roots."

$applied = 0
foreach ($repo in $list) {
    $rulesDir = Join-Path $repo '.cursor\rules'
    try {
        if (-not (Test-Path -LiteralPath $rulesDir)) {
            New-Item -ItemType Directory -Path $rulesDir -Force | Out-Null
        }
        foreach ($kv in $RuleFiles.GetEnumerator()) {
            $dest = Join-Path $rulesDir $kv.Key
            Set-Content -LiteralPath $dest -Value $kv.Value -Encoding UTF8
        }
        $applied++
        Write-Host "[ok] $repo"
    } catch {
        Write-Warning "Failed: $repo — $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Done. Rules written to $applied repositories."
Write-Host "Also add User Rules in Cursor Settings (see ~/.cursor/user-rules/PASTE_INTO_CURSOR_SETTINGS.md) if project rules are not picked up when no folder is a git root."
