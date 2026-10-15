#!/usr/bin/env bash
# Links every skill in skills/ into ~/.claude/skills, leaving alone any name
# already taken by something that does not point here.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
target="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$target"

for dir in "$repo"/skills/*/; do
  name="$(basename "$dir")"
  src="${dir%/}"
  dest="$target/$name"
  if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
    echo "ok       $name"
  elif [ -e "$dest" ] || [ -L "$dest" ]; then
    echo "saltata  $name: $dest esiste e non punta qui" >&2
  else
    ln -s "$src" "$dest"
    echo "collegata $name → $src"
  fi
done
