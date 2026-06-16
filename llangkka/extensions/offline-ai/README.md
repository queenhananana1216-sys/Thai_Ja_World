# 오프라인 AI 확장(구조만 제공)

요구사항: SSD에 모델/토큰/캐시를 받아, 인터넷이 끊겨도 로컬에서 “GPT처럼” 동작.

이 폴더는 아래처럼 “데이터가 없으면 다운로드(가능한 경우), 있으면 로컬 사용” 흐름을 만들기 위한 구조입니다.

## 추천 방식(예시)

- Ollama 또는 llama.cpp 계열을 로컬 실행
- 모델 다운로드/캐시 폴더를 `llangkka/extensions/offline-ai/data/models`로 고정

## 현재 제공되는 것

- `gpt.ps1` / `gpt.sh` : Ollama 실행용 래퍼(모델/프롬프트를 받아 1회 응답)
- `download-models.ps1` / `download-models.sh` : Ollama에서 모델을 SSD 폴더로 가져오기(인터넷 필요)

## 다음에 정해야 할 것(질문)

1. 로컬 LLM 실행은 `Ollama`로 갈까요, `llama.cpp`로 갈까요?
2. Ollama에서 기본 모델을 뭘로 둘까요? (예: `qwen2.5:7b`, `llama3.1:8b` 등)

결정되면 `download-model` 스크립트/설정 파일을 이 프로젝트에 추가할게요.

