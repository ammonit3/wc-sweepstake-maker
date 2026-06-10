#!/usr/bin/env bash
# One-command deploy: commit + push. Vercel auto-redeploys on push (~1 min).
# Usage:  ./ship.sh "what you changed"
set -e
MSG="${1:-update}"
git add -A
if git diff --cached --quiet; then echo "Nothing to commit."; exit 0; fi
git commit -m "$MSG"
git push
echo "✅ Pushed. Vercel will redeploy in ~1 minute."
