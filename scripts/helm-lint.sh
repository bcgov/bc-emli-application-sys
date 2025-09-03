#!/usr/bin/env bash
set -euo pipefail

if git diff --cached --name-only | grep -qE '^helm/.*\.(ya?ml|tpl)$'; then
  echo "Helm YAML changes detected, running kube-linter..."

  helm dependency build ./helm/main >/dev/null 2>&1

  # Direct pipe, no rendered.yaml saved
  if ! helm template ./helm/main | kube-linter lint -; then
    echo "kube-linter found issues in Helm charts. Please fix them before committing."
    exit 1
  else
    echo "kube-linter passed with no issues."
  fi
else
  echo "No Helm YAMLs changes, skipping kube-linter"
fi