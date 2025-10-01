#!/bin/bash

# Load environment variables from the .env.local file
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo ".env.local file not found. Please create one with the required STRIPE_API_KEY."
  exit 1
fi

# Check if STRIPE_API_KEY is set
if [ -z "$STRIPE_API_KEY" ]; then
  echo "STRIPE_API_KEY is not set. Please provide it in the .env.local file."
  exit 1
fi

# Check if STRIPE_API_VERSION is set
if [ -z "$STRIPE_API_VERSION" ]; then
  echo "STRIPE_API_VERSION is not set. Please provide it in the .env.local file."
  exit 1
fi

curl http://localhost:4000/stripe/sync \
     -X POST \
     -d '{"object": "all", "backfillRelatedEntities": true, "gte": 1577836800}' \
     -H "Content-Type: application/json" \
     -u $STRIPE_API_KEY: \
     -H "Stripe-Version: $STRIPE_API_VERSION" \

