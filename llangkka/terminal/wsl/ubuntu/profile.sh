# llangkka terminal profile (WSL bash)

llangkka_root="${LLANGKKA_ROOT:-/mnt/e/02_Workspace/llangkka}"
export LLANGKKA_ROOT="$llangkka_root"

export STARSHIP_CONFIG="$LLANGKKA_ROOT/terminal/common/starship.toml"
LANGKA_OMP="$LLANGKKA_ROOT/terminal/prompts/langka.omp.json"

# 오프라인 확장 데이터 경로 고정(터미널에서 바로 사용)
if [[ -n "${LLANGKKA_DATA_ROOT:-}" ]]; then
  export ARGOS_PACKAGES_DIR="$LLANGKKA_DATA_ROOT/offline-translation/packages"
  export OLLAMA_MODELS="$LLANGKKA_DATA_ROOT/offline-ai/data/models"
else
  export ARGOS_PACKAGES_DIR="$LLANGKKA_ROOT/extensions/offline-translation/data/packages"
  export OLLAMA_MODELS="$LLANGKKA_ROOT/extensions/offline-ai/data/models"
fi
export LLANGKKA_OLLAMA_MODEL="${LLANGKKA_OLLAMA_MODEL:-qwen2.5:7b}"

# 히스토리: 중복 제거 + append + 큰 히스토리 사이즈
export HISTCONTROL="ignoredups:erasedups"
export HISTSIZE="200000"
export HISTFILESIZE="200000"
shopt -s histappend 2>/dev/null || true

# 키바인딩: Ctrl+R이 기본 히스토리 탐색이지만, readline에서 동작을 보조
if command -v bind >/dev/null 2>&1; then
  bind '"\e[A":history-search-backward' 2>/dev/null || true
  bind '"\e[B":history-search-forward' 2>/dev/null || true
fi

# 프롬프트: oh-my-posh(langka 커스텀 테마) 우선, 없으면 starship
if command -v oh-my-posh >/dev/null 2>&1; then
  if [[ -f "$LANGKA_OMP" ]]; then
    eval "$(oh-my-posh init bash --config "$LANGKA_OMP")"
  else
    eval "$(oh-my-posh init bash)"
  fi
elif command -v starship >/dev/null 2>&1; then
  eval "$(starship init bash)"
fi

# llangkka translate/gpt 래퍼(터미널에서 바로 실행)
llangkka-translate() {
  "$LLANGKKA_ROOT/extensions/offline-translation/translate.sh" "$@"
}

llangkka-gpt() {
  "$LLANGKKA_ROOT/extensions/offline-ai/gpt.sh" "$@"
}

# 폴더/파일 색 구분: eza 있으면 우선(디렉터리 먼저 + 아이콘), 없으면 LS_COLORS + ls --color
if command -v eza >/dev/null 2>&1; then
  alias ls='eza --group-directories-first --icons=auto --color=always'
  alias ll='eza -la --group-directories-first --icons=auto --color=always'
  alias la='eza -a --group-directories-first --icons=auto --color=always'
else
  # di=디렉터리, ln=심볼릭링크, ex=실행파일, *.tar 등 압축류 구분
  export LS_COLORS='di=1;36:ln=1;35:so=1;32:pi=1;33:ex=1;32:bd=1;34:cd=1;33:su=0;41:sg=0;46:tw=0;42:ow=0;43:*.tar=1;31:*.zip=1;31:*.gz=1;31'
  alias ls='ls --color=auto'
  ll() { ls -alF; }
  la() { ls -A --color=auto; }
fi

# grep은 기본값에 색상만
if command -v grep >/dev/null 2>&1; then
  alias grep='grep --color=auto'
fi

# atuin이 있으면(선택) 히스토리 UX 개선
if command -v atuin >/dev/null 2>&1; then
  # atuin init은 환경에 따라 실패할 수 있으니 실패해도 종료하지 않음
  atuin init bash 2>/dev/null || true
fi

# 자연어 -> bash 명령 (Ollama, 실행 전 확인)
NL_SH="$LLANGKKA_ROOT/terminal/natural/nl.sh"
if [[ -f "$NL_SH" ]]; then
  # shellcheck disable=SC1090
  source "$NL_SH"
fi

