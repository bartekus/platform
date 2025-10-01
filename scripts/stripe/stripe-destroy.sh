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

# Function to delete customers
delete_customers() {
  echo "Deleting customers..."
  customer_ids=$(curl -s -X GET "https://api.stripe.com/v1/customers?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $customer_ids; do
    echo "Deleting customer: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/customers/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete subscriptions
delete_subscriptions() {
  echo "Deleting subscriptions..."
  subscription_ids=$(curl -s -X GET "https://api.stripe.com/v1/subscriptions?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $subscription_ids; do
    echo "Deleting subscription: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/subscriptions/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete products
delete_plans() {
  echo "Deleting plans..."
  plan_ids=$(curl -s -X GET "https://api.stripe.com/v1/plans?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $plan_ids; do
    echo "Deleting plans: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/plans/$id" \
      -u $STRIPE_API_KEY:
  done
}

delete_prices() {
  echo "Deleting prices..."
  price_ids=$(curl -s -X GET "https://api.stripe.com/v1/prices?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $price_ids; do
    echo "Deleting prices: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/prices/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete products
delete_products() {
  echo "Deleting products..."
  product_ids=$(curl -s -X GET "https://api.stripe.com/v1/products?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $product_ids; do
    echo "Deleting product: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/products/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete payment intents
delete_payment_intents() {
  echo "Deleting payment intents..."
  payment_intent_ids=$(curl -s -X GET "https://api.stripe.com/v1/payment_intents?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $payment_intent_ids; do
    echo "Deleting payment intent: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/payment_intents/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete payment methods
delete_payment_methods() {
  echo "Deleting payment methods..."
  payment_method_ids=$(curl -s -X GET "https://api.stripe.com/v1/payment_methods?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $payment_method_ids; do
    echo "Detaching payment method: $id"
    curl -s -X POST "https://api.stripe.com/v1/payment_methods/$id/detach" \
      -u $STRIPE_API_KEY:
  done
}

# Function to delete setup intents
delete_setup_intents() {
  echo "Deleting setup intents..."
  setup_intent_ids=$(curl -s -X GET "https://api.stripe.com/v1/setup_intents?limit=100" \
    -u $STRIPE_API_KEY: | jq -r '.data[].id')

  for id in $setup_intent_ids; do
    echo "Deleting setup intent: $id"
    curl -s -X DELETE "https://api.stripe.com/v1/setup_intents/$id" \
      -u $STRIPE_API_KEY:
  done
}

# Main function to execute all deletions
main() {
  delete_customers
  delete_subscriptions
  delete_plans
  delete_prices
  delete_products
  delete_payment_intents
  delete_payment_methods
  delete_setup_intents
  echo "Purge completed."
}

# Execute the main function
main
