#!/usr/bin/env bash
# GitHub keeps refs/pull/N/head on merged PRs pointing at the old tip SHA.
# That tip may include Co-authored-by: Cursor, which keeps cursoragent in the
# Contributors graph. Hidden refs cannot be updated via git push (rejected).
# Republishing to a new repository is the reliable self-service fix.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Scanning reachable commits from HEAD for cursoragent co-author (must be empty) =="
bad=""
while read -r h; do
  if git show -s --format=%B "$h" | grep -q 'cursoragent@cursor.com'; then
    bad="$bad $h"
  fi
done < <(git rev-list HEAD)
if [[ -n "${bad// /}" ]]; then
  echo "FAIL: Found Co-authored-by Cursor in:" >&2
  echo "$bad" >&2
  exit 1
fi
echo "OK."

echo ""
echo "GitHub rejects: git push <sha>:refs/pull/1/head  →  deny updating a hidden ref"
echo ""
echo "Republish (same repo name possible after rename):"
echo "  1. GitHub → repo → Settings → General → Rename repository"
echo "       e.g. inventory-reservation-system-archived"
echo "  2. Create a NEW empty repo named inventory-reservation-system (no README)."
echo "  3. From this clone:"
echo "       git remote set-url origin git@github.com:USER/inventory-reservation-system.git"
echo "       git push -u origin main"
echo "  Optional: delete stray branches on the old repo first; re-add Actions secrets & branch protection on the new repo."
echo ""
echo "Or contact GitHub Support and reference stale refs/pull/1/head vs clean refs/heads/main."
