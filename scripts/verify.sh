#!/usr/bin/env bash
# scripts/verify.sh: the single answer to "is this change OK?"
#
# Run by you, the git pre-commit hook, and every agent (Claude Code and Antigravity):
#   bash scripts/verify.sh fast   # < ~30 s, no test suites: lint, format, types, staged-file checks
#   bash scripts/verify.sh full   # everything: fast + tests, build, analysis, migrations, validate
# Exit codes: 0 ok, 1 a check failed, 3 full ran no checks at all.

set -o pipefail
MODE="${1:-full}"
case "$MODE" in fast|full) ;; *) echo "usage: verify.sh [fast|full]" >&2; exit 64 ;; esac
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

# Ensure agent-team managed tools (~/.agent-team/bin) are in PATH
if [ -d "$HOME/.agent-team/bin" ]; then
  case ":$PATH:" in *":$HOME/.agent-team/bin:"*) ;; *) PATH="$HOME/.agent-team/bin:$PATH" ;; esac
fi

FAILED=""; SKIPPED=""; RAN=0
step() {
  local label="$1"; shift
  printf '\n> %s\n' "$label"; RAN=$((RAN + 1))
  if "$@"; then printf 'ok  %s\n' "$label"; else printf 'FAIL %s\n' "$label"; FAILED="$FAILED, $label"; fi
}
staged() { git diff --cached --name-only --diff-filter=ACMR -- "$@"; }
skip() {
  case "$SKIPPED," in *", $1,"*) return 0 ;; esac
  printf 'SKIPPED %s\n' "$1" >&2; SKIPPED="$SKIPPED, $1"
}
have() { if command -v "$1" >/dev/null 2>&1 || [ -x "$1" ]; then return 0; fi; skip "$1 (not installed)"; return 1; }

# ---------------------------------------------------------------- FAST ----
fast_checks() {
  [ -f "tools/guard.sh" ] && step "guard check" bash tools/guard.sh
  have npm && [ -f package.json ] && step "lint" npm run -s lint
  have npm && [ -f tsconfig.json ] && step "typecheck" npm run -s typecheck
  have npm && [ -f .prettierrc ] && step "format check" npm run -s format:check
}

# ---------------------------------------------------------------- FULL ----
full_checks() {
  have npm && step "unit tests" npm run -s test
  have npm && step "build (electron-vite)" npm run -s build
  have npm && step "package (unpacked)" npm run -s package
  have npm && step "verify fuses" npm run -s fuses:verify
}

fast_checks
if [ "$MODE" = "full" ]; then full_checks; fi

if [ -n "$FAILED" ]; then
  printf '\nverify %s: FAILED (%s)\n' "$MODE" "${FAILED#, }"
  exit 1
fi
if [ -n "$SKIPPED" ]; then
  printf '\nverify %s: INCOMPLETE. %d checks passed, NOT VERIFIED (skipped): %s\n' "$MODE" "$RAN" "${SKIPPED#, }"
  exit 0
fi
if [ "$RAN" -eq 0 ]; then
  printf '\nverify %s: NO CHECKS RAN. Nothing is configured yet.\n' "$MODE"
  if [ "$MODE" = "full" ]; then exit 3; fi
  exit 0
fi
printf '\nverify %s: OK (%d checks)\n' "$MODE" "$RAN"
