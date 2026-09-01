#!/bin/sh
set -eu

repository_root="${CONTENT_REPOSITORY_ROOT:-/content-repository}"
repository="${CONTENT_GIT_REPOSITORY:-andwati/andwati.com}"
branch="${CONTENT_GIT_BRANCH:-main}"

case "$repository" in
  *[!A-Za-z0-9._/-]* | /* | */ | *..*)
    echo "Invalid CONTENT_GIT_REPOSITORY: $repository" >&2
    exit 1
    ;;
esac

mkdir -p "$repository_root"

if [ ! -d "$repository_root/.git" ]; then
  if [ -n "$(find "$repository_root" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    echo "$repository_root is not empty and is not a Git checkout" >&2
    exit 1
  fi

  git clone \
    --branch "$branch" \
    --single-branch \
    "https://github.com/$repository.git" \
    "$repository_root"
else
  git -C "$repository_root" fetch origin "$branch"
  git -C "$repository_root" checkout "$branch"

  if [ -z "$(git -C "$repository_root" status --porcelain)" ]; then
    git -C "$repository_root" merge --ff-only "origin/$branch"
  else
    echo "Content checkout has unpublished changes; preserving them without pulling." >&2
  fi
fi

export CONTENT_REPOSITORY_ROOT="$repository_root"
exec node node_modules/@strapi/strapi/bin/strapi.js start
