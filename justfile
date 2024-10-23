check:
  #!/usr/bin/env bash
  set -uxo pipefail
  export NODE_NO_WARNINGS=1
  npx prettier -c "**/*.(mjs|ts|json|md)"
  npx eslint -c eslint.config.mjs
  npx tsc -p api/tsconfig.json

update-deps:
  #!/usr/bin/env bash
  set -uxo pipefail
  npx npm-check-updates -u --workspaces --root
  npm installnp

test-api:
  #!/usr/bin/env bash
  npm -w @nillion/api test -- --coverage
