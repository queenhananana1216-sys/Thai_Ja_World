# A 환경 — 로컬 전용(외부 전송 최소화) 빠른 구축

**목표**: 터미널·화면 번역이 **인터넷으로 텍스트를 보내지 않게** 맞춘다.  
(100% “앱이 디스크에 아무것도 안 쓴다”까지는 보장할 수 없고, **네트워크로 나가지 않게**에 초점을 둡니다.)

## 1) 원칙 (한 줄)

- **터미널 텍스트**: **Argos Translate**만 (로컬 패키지).
- **화면 OCR 번역**: **RSTGameTranslation + Translation = Ollama**만. **Google/기타 클라우드 끔**.
- **챗형 AI**: 민감할 땐 **클라우드 웹챗에 붙여넣지 않기** → 필요하면 **Ollama `ollama run`**만.

## 2) 한 번에 맞추기 (PowerShell)

llangkka 루트에서:

```powershell
cd e:\02_Workspace\llangkka
.\tools\local-only\apply-session-local-only.ps1
.\tools\local-only\verify-a-environment.ps1
```

`apply-session-local-only.ps1`은 **현재 PowerShell 창에만** 적용됩니다. 매번 켜도 되고, 프로필에 한 줄 넣어도 됩니다.

## 3) Ollama (로컬만)

1. Windows에서 Ollama 설치 후 **모델만 로컬에 pull** (예: `qwen2.5:7b`).
2. **API가 로컬에서만 열려 있는지** 확인:

```powershell
.\tools\screen-translation\check-ollama-api.ps1
```

3. **원격 접속을 켠 적이 있다면** 다시 **로컬 전용**으로 되돌리세요(Ollama 문서의 Listen/방화벽 설정 확인).  
   A 환경에서는 **LAN 밖으로 11434가 열리지 않게** 하는 게 안전합니다.

`apply-session-local-only.ps1`은 **`OLLAMA_HOST`를 바꾸지 않습니다**(Ollama 서버 바인딩과 충돌할 수 있음).  
대신 `LLANGKKA_OLLAMA_API=http://127.0.0.1:11434`만 세션에 표시용으로 둡니다.

## 4) RSTGameTranslation (화면 번역)

1. **Settings → Translation → Ollama**  
   - 주소: `http://127.0.0.1:11434`  
   - 모델: 로컬에 받아 둔 것만
2. **Google Translate / Gemini / 기타 온라인은 선택하지 않기.**
3. 민감할 때는 **영역을 작게** (`Alt+Q`) — 넓게 잡을수록 한 번에 읽히는 텍스트가 많아짐.

## 5) 터미널 번역 (Argos)

1. WSL 또는 Windows에서 `setup` + `download`는 **가능하면 한 번만** 네트워크로 패키지 수신.
2. 이후에는 **`LLANGKKA_DATA_ROOT`를 SSD**에 두면 패키지만 들고 다녀도 됨.

```powershell
# 예: SSD 데이터 루트 (본인 경로로)
$env:LLANGKKA_DATA_ROOT = "D:\llangkka-data"
```

3. 오프라인으로 패키지 설치만 할 때:

```bash
# WSL 예시
export LLANGKKA_OFFLINE=1
```

(기존 `extensions/offline-translation` 스크립트 README 참고.)

## 6) 네트워크 끊고 스모크 테스트 (권장)

1. Wi-Fi/랜 끄기  
2. `verify-a-environment.ps1` 다시 실행  
3. `llangkka-translate` / `ollama run` / RST(Ollama)로 짧은 문장만 테스트  

클라우드 번역이 꺼져 있으면 **번역이 실패하거나 RST에서 Ollama만 동작**해야 정상입니다.

## 7) 한계 (솔직히)

- OCR/번역 앱은 **로컬 디스크·메모리**에 텍스트가 잠깐이라도 남을 수 있음.  
- **카톡·뱅킹** 등은 앱 정책·보안으로 캡처가 막히거나, 도구 사용이 **약관 위반**일 수 있음 → 그런 화면은 **아예 번역 도구 끄기**가 최선입니다.
