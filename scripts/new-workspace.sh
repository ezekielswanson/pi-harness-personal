#!/bin/sh
# Copy workspace-template to <dir> and git init.
# Refuses a directory inside this repo or under ~/.pi.
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/new-workspace.sh <dir>" >&2
  exit 2
fi

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
root_real=$(CDPATH= cd -- "$root" && pwd -P)
dest_real=$(readlink -m -- "$1")
home_pi=$(readlink -m -- "${HOME%/}/.pi")

case "$dest_real" in
  "$root_real"|"$root_real"/*)
    echo "Refusing to create a workspace inside the harness repo ($dest_real)." >&2
    exit 1
    ;;
  "$home_pi"|"$home_pi"/*)
    echo "Refusing to create a workspace under ~/.pi ($dest_real)." >&2
    exit 1
    ;;
esac

mkdir -p -- "$dest_real"
cp -R "$root/workspace-template/." "$dest_real/"
git -C "$dest_real" init -b main
echo "Workspace ready at $dest_real"
