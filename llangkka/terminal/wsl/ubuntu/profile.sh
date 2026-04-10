# llangkka terminal profile (WSL bash)

llangkka_root="${LLANGKKA_ROOT:-/mnt/e/llangkka_project/llangkka}"
export LLANGKKA_ROOT="$llangkka_root"

export STARSHIP_CONFIG="$LLANGKKA_ROOT/terminal/common/starship.toml"
LANGKA_OMP="$LLANGKKA_ROOT/terminal/prompts/langka.omp.json"

if [[ -n "${LLANGKKA_DATA_ROOT:-}" ]]; then
  export ARGOS_PACKAGES_DIR="$LLANGKKA_DATA_ROOT/offline-translation/packages"
  export OLLAMA_MODELS="$LLANGKKA_DATA_ROOT/offline-ai/data/models"
else
  export ARGOS_PACKAGES_DIR="$LLANGKKA_ROOT/extensions/offline-translation/data/packages"
  export OLLAMA_MODELS="$LLANGKKA_ROOT/extensions/offline-ai/data/models"
fi
export LLANGKKA_OLLAMA_MODEL="${LLANGKKA_OLLAMA_MODEL:-qwen2.5:7b}"

# ── 히스토리 ──────────────────────────────────────────────────────────────────
export HISTCONTROL="ignoredups:erasedups"
export HISTSIZE="200000"
export HISTFILESIZE="200000"
shopt -s histappend 2>/dev/null || true

if command -v bind >/dev/null 2>&1; then
  bind '"\e[A":history-search-backward' 2>/dev/null || true
  bind '"\e[B":history-search-forward' 2>/dev/null || true
fi

# ── 프롬프트: oh-my-posh 우선 → starship 폴백 → 미니 프롬프트 ────────────────
if command -v oh-my-posh >/dev/null 2>&1; then
  if [[ -f "$LANGKA_OMP" ]]; then
    eval "$(oh-my-posh init bash --config "$LANGKA_OMP")"
  else
    eval "$(oh-my-posh init bash)"
  fi
elif command -v starship >/dev/null 2>&1; then
  eval "$(starship init bash)"
else
  _langka_ps1() {
    local ec=$?
    local P='\[\e[38;5;141m\]'
    local B='\[\e[38;5;111m\]'
    local G='\[\e[38;5;114m\]'
    local R='\[\e[38;5;203m\]'
    local Z='\[\e[0m\]'
    local arrow
    if [[ $ec -eq 0 ]]; then arrow="${G}>"; else arrow="${R}!"; fi
    PS1="${P}langka ${B}\W ${arrow}${Z} "
  }
  PROMPT_COMMAND="_langka_ps1"
fi

# ── ls / grep ─────────────────────────────────────────────────────────────────
if command -v eza >/dev/null 2>&1; then
  alias ls='eza --group-directories-first --icons=auto --color=always'
  alias ll='eza -la --group-directories-first --icons=auto --color=always'
  alias la='eza -a --group-directories-first --icons=auto --color=always'
  alias lt='eza --tree --level=2 --icons=auto'
else
  export LS_COLORS='di=1;36:ln=1;35:so=1;32:pi=1;33:ex=1;32:bd=1;34:cd=1;33:su=0;41:sg=0;46:tw=0;42:ow=0;43:*.tar=1;31:*.zip=1;31:*.gz=1;31'
  alias ls='ls --color=auto'
  ll() { ls -alF; }
  la() { ls -A --color=auto; }
fi

alias grep='grep --color=auto'
alias egrep='egrep --color=auto'
alias fgrep='fgrep --color=auto'

# ── 편의 함수 ─────────────────────────────────────────────────────────────────
llangkka-translate() {
  if [[ -f "$LLANGKKA_ROOT/extensions/offline-translation/translate.sh" ]]; then
    "$LLANGKKA_ROOT/extensions/offline-translation/translate.sh" "$@"
  else
    echo "translate.sh not found" >&2
  fi
}

llangkka-gpt() {
  if [[ -f "$LLANGKKA_ROOT/extensions/offline-ai/gpt.sh" ]]; then
    "$LLANGKKA_ROOT/extensions/offline-ai/gpt.sh" "$@"
  else
    echo "gpt.sh not found" >&2
  fi
}

alias translate='llangkka-translate'
alias gpt='llangkka-gpt'

mkcd() { mkdir -p "$1" && cd "$1"; }
dirsize() { du -sh "${1:-.}" | sort -hr; }
findfile() { find . -iname "*$1*" 2>/dev/null; }

sysinfo() {
  local P='\e[38;5;141m' B='\e[38;5;111m' Z='\e[0m'
  echo ""
  echo -e "${P}========== System Info ==========${Z}"
  echo -e "${B}Host    :${Z} $(hostname)"
  echo -e "${B}OS      :${Z} $(uname -s) $(uname -r)"
  echo -e "${B}CPU     :${Z} $(nproc) cores"
  echo -e "${B}Memory  :${Z} $(free -h 2>/dev/null | awk 'NR==2 {print $2}' || echo 'N/A')"
  echo -e "${B}Disk /  :${Z} $(df -h / 2>/dev/null | awk 'NR==2 {print $2 " (" $5 " used)"}' || echo 'N/A')"
  echo -e "${B}Uptime  :${Z} $(uptime -p 2>/dev/null || echo 'N/A')"
  echo -e "${P}=================================${Z}"
  echo ""
}

vpn-status() {
  if command -v nordvpn >/dev/null 2>&1; then
    nordvpn status
  elif command -v nmcli >/dev/null 2>&1; then
    nmcli connection show --active | grep -i vpn || echo "VPN not connected"
  else
    echo "No VPN tool found" >&2
  fi
}

alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gpl='git pull'
alias gs='git status'
alias gd='git diff'
alias glog='git log --oneline --graph --all'

if command -v docker >/dev/null 2>&1; then
  alias d='docker'
  alias dc='docker-compose'
  alias dps='docker ps -a'
  alias dimg='docker images'
fi

if command -v atuin >/dev/null 2>&1; then
  eval "$(atuin init bash 2>/dev/null)" || true
fi

NL_SH="$LLANGKKA_ROOT/terminal/natural/nl.sh"
if [[ -f "$NL_SH" ]]; then
  # shellcheck disable=SC1090
  source "$NL_SH"
fi

# ── 시작 배너 ─────────────────────────────────────────────────────────────────
_langka_banner() {
  local P='\e[38;5;141m' S='\e[38;5;246m' Z='\e[0m'
  echo ""
  echo -e "  ${P}llangkka${Z} ${S}| bash $(bash --version 2>/dev/null | head -1 | sed 's/.*version //' | sed 's/(.*//' | xargs) | $(date '+%Y-%m-%d %H:%M')${Z}"
  echo -e "  ${S}sysinfo, translate, gpt, nl <query>${Z}"
  if [[ -d /mnt/e ]]; then
    echo -e "  ${S}E: drive mounted${Z}"
  else
    echo -e "  \e[38;5;203mE: drive not mounted${Z}"
  fi
  echo ""
}
_langka_banner
