#!/bin/sh
# Optional. Off by default. Run it yourself. settings.json is never locked.
# Locks only the personal agent dir and personal config dir. Refuses ~/.pi/agent. # al-dir-check
set -eu

action="${1:-}"
agent="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent-personal}" # default-fallback
agent="${agent%/}"
config="${PI_PERSONAL_HOME:-$HOME/.config/pi-harness-personal}" # default-fallback
config="${config%/}"
al_dir="$HOME/.pi/agent" # al-dir-check
if [ "$agent" = "$al_dir" ]; then
  echo "Refusing to touch $al_dir. Start with pi-personal." >&2 # al-dir-check
  exit 1
fi

if [ -z "$action" ]; then
  echo "Optional. Off by default. Run it yourself. settings.json is never locked."
  exit 0
fi

checkout="$agent/git/github.com/ezekielswanson/pi-harness-personal"
extensions="$agent/extensions"
approved="$config/harness.sha"
script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
case "$script_dir" in
  "$checkout"/scripts) ;;
  *)
    echo "Run the lock script from the installed checkout, not this working copy:" >&2
    echo "  $checkout/scripts/lock-harness.sh $action" >&2
    exit 1
    ;;
esac

tag_file="$checkout/src/runtime/harness-tag"
if [ ! -f "$tag_file" ]; then
  echo "Refusing to continue. $tag_file is missing." >&2
  exit 1
fi
harness_tag=$(tr -d '[:space:]' < "$tag_file")
printf '%s\n' "$harness_tag" | grep -Eq '^personal-v[0-9]+$' || {
  echo "Refusing to continue. $tag_file must contain the pin tag." >&2
  exit 1
}
os=$(uname -s)

lock_path() {
  target=$1
  if [ ! -e "$target" ]; then
    echo "missing: $target" >&2
    return 1
  fi
  if [ "$os" = "Darwin" ]; then
    sudo chflags -R schg "$target"
  else
    sudo chattr -R +i "$target"
  fi
}

lock_one() {
  target=$1
  if [ ! -e "$target" ]; then
    echo "missing: $target" >&2
    return 1
  fi
  if [ "$os" = "Darwin" ]; then
    sudo chflags schg "$target"
  else
    sudo chattr +i "$target"
  fi
}

unlock_path() {
  target=$1
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    return 0
  fi
  if [ "$os" = "Darwin" ]; then
    sudo chflags -R noschg "$target"
  else
    sudo chattr -R -i "$target"
  fi
}

unlock_one() {
  target=$1
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    return 0
  fi
  if [ "$os" = "Darwin" ]; then
    sudo chflags noschg "$target"
  else
    sudo chattr -i "$target"
  fi
}

require_pin() {
  if [ ! -d "$checkout/.git" ]; then
    echo "Install first, without -l:" >&2
    echo "  PI_CODING_AGENT_DIR=$agent pi install git:github.com/ezekielswanson/pi-harness-personal@$harness_tag" >&2
    exit 1
  fi
  if [ -e "$checkout/node_modules" ] || [ -L "$checkout/node_modules" ]; then
    echo "Remove $checkout/node_modules. The harness has no runtime npm dependencies." >&2
    exit 1
  fi
  head=$(git -C "$checkout" rev-parse HEAD)
  if [ -L "$approved" ] || [ ! -f "$approved" ]; then
    echo "Write the approved SHA as a regular file, not a symlink:" >&2
    echo "  mkdir -p $config" >&2
    echo "  git -C $checkout rev-parse HEAD > $approved" >&2
    exit 1
  fi
  file_sha=$(tr -d '[:space:]' < "$approved")
  if [ "$file_sha" != "$head" ]; then
    echo "Refusing to continue. HEAD $head is not the approved SHA $file_sha in $approved." >&2
    exit 1
  fi
  dirty=$(git -C "$checkout" status --porcelain)
  tag=$(git -C "$checkout" tag --points-at HEAD | awk -v expected="$harness_tag" '$0 == expected { found=1 } END { if (found) print "yes" }')
  kind=$(git -C "$checkout" cat-file -t "refs/tags/$harness_tag" 2>/dev/null || true)
  if [ -n "$dirty" ] || [ "$tag" != "yes" ] || [ "$kind" != "tag" ]; then
    echo "Refusing to continue. The checkout is dirty or is not the annotated tag $harness_tag." >&2
    exit 1
  fi
  if [ -d "$extensions" ]; then
    extra=$(find "$extensions" -type f ! -path "$extensions/subagent/config.json" || true)
    if [ -n "$extra" ]; then
      echo "Refusing to continue. $extensions may contain only extensions/subagent/config.json." >&2
      exit 1
    fi
  fi
}

case "$action" in
  paths)
    printf 'agent %s\nconfig %s\ncheckout %s\n' "$agent" "$config" "$checkout"
    ;;
  lock)
    require_pin
    for parent in "$agent/git" "$agent/git/github.com" "$agent/git/github.com/ezekielswanson"; do
      if [ ! -d "$parent" ]; then
        echo "missing: $parent" >&2
        exit 1
      fi
    done
    mkdir -p "$config" "$extensions"
    lock_path "$checkout"
    lock_one "$extensions"
    lock_path "$approved"
    lock_one "$agent/git"
    lock_one "$agent/git/github.com"
    lock_one "$agent/git/github.com/ezekielswanson"
    lock_one "$config"
    echo "Locked $checkout, $approved, the git parents, and $config. settings.json is never locked. extensions/subagent/config.json stays writable."
    ;;
  unlock)
    unlock_one "$config"
    unlock_one "$agent/git/github.com/ezekielswanson"
    unlock_one "$agent/git/github.com"
    unlock_one "$agent/git"
    unlock_path "$checkout"
    unlock_one "$extensions"
    unlock_path "$approved"
    echo "Unlocked. Install $harness_tag, write harness.sha again, then run: $0 lock"
    ;;
  check)
    require_pin
    echo "Pin tag $harness_tag matches HEAD."
    ;;
  *)
    echo "Usage: $0 lock|unlock|check|paths" >&2
    echo "Optional. Off by default. Run it yourself. settings.json is never locked." >&2
    exit 2
    ;;
esac
