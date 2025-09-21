#!/bin/sh
set -e

# Run standard Logto setup with --swe
npm run cli db seed -- --swe

# Run our custom setup
ls -a
node ./packages/cli/custom-setup/index.js

# Start the application
npm start
