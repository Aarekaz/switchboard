#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ "$VERSION" == "--" ]]; then
  VERSION="${2:-}"
fi

VERSION="${VERSION#v}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit or stash changes first."
  exit 1
fi

echo "Running lint..."
pnpm lint

echo "Running build..."
pnpm build

echo "Running tests..."
pnpm test

echo "Bumping versions to $VERSION..."
pnpm -r --include-workspace-root exec pnpm version "$VERSION" --no-git-tag-version

echo "Committing and tagging release..."
git add -A
git commit -m "Release v$VERSION"
git tag "v$VERSION"

echo "Release prepared. Push with:"
echo "  git push origin main --tags"
