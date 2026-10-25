#!/usr/bin/env bash
# tools/guard.sh: Clean-room and secret audit guard for electron-foundation
set -euo pipefail

echo "==> Running Guard: Clean-room & Security Audit..."

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

FAILED=0

# 1. Clean-room check: forbidden private entities
echo "-> Checking clean-room compliance (forbidden entity names)..."
FORBIDDEN=("VueXR" "Trium Designs" "Fudge3d")

for pattern in "${FORBIDDEN[@]}"; do
  if git grep -I -i "$pattern" -- ':!.pipeline' ':!tools/guard.*' ':!Open Source Repository Specs.md' 2>/dev/null; then
    echo "FAIL: Clean-room violation! Found '$pattern' in files above." >&2
    FAILED=1
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo "  ✓ Zero references to private entities found."
fi

# 2. Secret check: unredacted private keys or tokens
echo "-> Checking for exposed secrets or credentials..."
SECRETS=("BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY" "ghp_[A-Za-z0-9]{36}" "AKIA[0-9A-Z]{16}")

for pattern in "${SECRETS[@]}"; do
  if git grep -I -E "$pattern" -- ':!.pipeline' ':!tools/guard.*' 2>/dev/null; then
    echo "FAIL: Potential secret leak detected for pattern: $pattern" >&2
    FAILED=1
  fi
done

# 3. Action SHA Pinning check
echo "-> Checking GitHub Actions 40-character SHA pinning..."
if [ -d ".github/workflows" ]; then
  for wf in .github/workflows/*.yml; do
    [ -f "$wf" ] || continue
    while IFS= read -r line; do
      if [[ "$line" =~ uses:[[:space:]]+([^@[:space:]]+)@([^[:space:]#]+) ]]; then
        action="${BASH_REMATCH[1]}"
        ref="${BASH_REMATCH[2]}"
        if [[ "$action" != ./* ]]; then
          if [[ ! "$ref" =~ ^[0-9a-f]{40}$ ]]; then
            echo "FAIL: Action '$action' in $wf is not pinned to a 40-character SHA: $ref" >&2
            FAILED=1
          fi
        fi
      fi
    done < "$wf"
  done
fi

if [ "$FAILED" -ne 0 ]; then
  echo "==> Guard check FAILED." >&2
  exit 1
fi

echo "==> Guard check PASSED. Repository is clean."
exit 0
