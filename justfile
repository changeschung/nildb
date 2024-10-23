check:
  #!/usr/bin/env bash
  set -uxo pipefail
  bunx prettier -c "**/*.(mjs|ts|json|md)"
  bunx eslint -c eslint.config.mjs
  bunx tsc -p api/tsconfig.json
