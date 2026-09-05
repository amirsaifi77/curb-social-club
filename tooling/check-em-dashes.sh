#!/usr/bin/env bash
# Fails if any Markdown file in the repo contains an em dash.
set -euo pipefail
cd "$(dirname "$0")/.."
if grep -rn --include='*.md' --exclude-dir=node_modules $'\xe2\x80\x94' . ; then
  echo "Em dashes found. Replace with commas, periods, or parentheses."
  exit 1
fi
echo "No em dashes found."
