#!/usr/bin/env bash
# Refresh the vendored Canvas LMS plugin from GitHub while keeping this
# project's own skills (lms-calendar, study) and local manifest.
#
#   scripts/sync-upstream.sh [git-ref]        # default: main
#
# Afterwards: review `git diff canvas-lms-claude/`, update the commit in
# canvas-lms-claude/UPSTREAM.md, run scripts/verify-connection.mjs, then
# `claude plugin marketplace update canvas-lms-local` on each machine.
set -euo pipefail

REF="${1:-main}"
REPO_URL="https://github.com/iamnotfemale/canvas-lms-for-agents.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/canvas-lms-claude/plugin"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet --filter=blob:none "$REPO_URL" "$WORK/upstream"
git -C "$WORK/upstream" checkout --quiet "$REF"
COMMIT="$(git -C "$WORK/upstream" rev-parse HEAD)"
SRC="$WORK/upstream/plugin"

# Keep project-owned files.
mkdir -p "$WORK/keep/skills"
cp -a "$DEST/skills/lms-calendar" "$DEST/skills/study" "$WORK/keep/skills/"
cp -a "$DEST/.claude-plugin/plugin.json" "$WORK/keep/plugin.json"

rm -rf "$DEST"
cp -a "$SRC" "$DEST"
rm -rf "$DEST/.codex-plugin" "$DEST/.mcp.codex.json" "$DEST/node_modules" "$DEST/pdf-runtime/node_modules"
cp -a "$WORK/keep/skills/." "$DEST/skills/"
cp -a "$WORK/keep/plugin.json" "$DEST/.claude-plugin/plugin.json"
cp -a "$WORK/upstream/LICENSE" "$ROOT/canvas-lms-claude/LICENSE"

UPSTREAM_VERSION="$(node -p "require('$SRC/.claude-plugin/plugin.json').version")"
echo "Synced upstream $COMMIT (plugin $UPSTREAM_VERSION)."
echo "Next: bump the version in canvas-lms-claude/plugin/.claude-plugin/plugin.json and"
echo "canvas-lms-claude/.claude-plugin/marketplace.json to ${UPSTREAM_VERSION}-local.N, and update UPSTREAM.md."
