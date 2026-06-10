#!/usr/bin/env bash
# One-time setup: install deps, create the GitHub repo, and push.
# Run once from anywhere:  bash ~/Sweepstake/wc-sweepstake-maker/setup.sh
set -e

cd ~/Sweepstake/wc-sweepstake-maker

npm install
chmod +x ship.sh

git init -b main
git add -A
git commit -m "initial wc sweepstake maker"

# Creates the repo under your account and pushes in one go.
# (If gh asks you to log in, run `gh auth login` then re-run this line.)
gh repo create ammonit3/wc-sweepstake-maker --public --source=. --push

echo ""
echo "✅ Pushed to GitHub. Next: import the repo at https://vercel.com/new,"
echo "   add a KV store, set your env vars, and deploy."
echo "   After the first deploy, ship changes any time with:  ./ship.sh \"message\""
