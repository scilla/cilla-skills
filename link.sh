#!/usr/bin/env bash
# Links every skill in skills/ into the global skills folder of each agent.
#
#   ./link.sh                  # claude codex cursor gemini copilot, those installed
#   ./link.sh claude continue  # just these
#
# The folders are the ones the `skills` CLI (vercel-labs/skills 1.7.0) uses
# per agent. ~/.agents/skills is left out: it is that CLI's own store, and
# none of these agents reads it. Continue is opt-in.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"

home_of() {
  case "$1" in
    claude) echo "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" ;;
    codex) echo "${CODEX_HOME:-$HOME/.codex}" ;;
    cursor) echo "$HOME/.cursor" ;;
    gemini) echo "$HOME/.gemini" ;;
    copilot) echo "$HOME/.copilot" ;;
    continue) echo "$HOME/.continue" ;;
    *) echo "agente sconosciuto: $1 (claude, codex, cursor, gemini, copilot, continue)" >&2; exit 1 ;;
  esac
}

if [ $# -gt 0 ]; then agents=("$@"); else agents=(claude codex cursor gemini copilot); fi

for agent in "${agents[@]}"; do
  home="$(home_of "$agent")"
  if [ ! -d "$home" ]; then
    echo "$agent: non installato ($home), salto"
    continue
  fi
  mkdir -p "$home/skills"
  for dir in "$repo"/skills/*/; do
    name="$(basename "$dir")"
    src="${dir%/}"
    dest="$home/skills/$name"
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
      echo "$agent: ok $name"
    elif [ -L "$dest" ] && [ ! -e "$dest" ]; then
      # A dangling link (the repo moved): nothing to lose in replacing it.
      ln -sfn "$src" "$dest"
      echo "$agent: ricollegata $name"
    elif [ -e "$dest" ] || [ -L "$dest" ]; then
      echo "$agent: saltata $name, $dest esiste e non punta qui" >&2
    else
      ln -s "$src" "$dest"
      echo "$agent: collegata $name"
    fi
  done
done
