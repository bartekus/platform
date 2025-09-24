#!/bin/sh
set -e

# Trust mkcert root (Debian/Ubuntu/Alpine both support this path)
if command -v update-ca-certificates >/dev/null 2>&1; then
  update-ca-certificates || true
fi

# Run standard Logto setup with --swe
npm run cli db seed -- --swe

# Run our custom setup
ls -a
node ./packages/cli/custom-setup/index.js

# Start the application
npm start
