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

# Initialize arrays to store price IDs
price_ids_monthly=()
price_ids_annual=()

# Function to create a Stripe product and price
create_product() {
  local name="$1"
  local description="$2"
  local price_monthly="$3"
  local price_annual="$4"
  local organizations="$5"
  local members="$6"
  local projects="$7"
  local contracts="$8"

  # Create Product
  product_id=$(curl -s https://api.stripe.com/v1/products \
    -u $STRIPE_API_KEY: \
    -H "Stripe-Version: $STRIPE_API_VERSION" \
    -d name="$name" \
    -d description="$description" \
    -d metadata[organizations]="$organizations" \
    -d metadata[projects]="$projects" \
    -d metadata[contracts]="$contracts" \
    -d metadata[members]="$members" \
    | jq -r .id)

  product_ids+=("$product_id")

  # Create Annual Price
  annual_price_id=$(curl -s https://api.stripe.com/v1/prices \
    -u $STRIPE_API_KEY: \
    -H "Stripe-Version: $STRIPE_API_VERSION" \
    -d product="$product_id" \
    -d unit_amount="$price_annual" \
    -d currency="usd" \
    -d recurring[interval]="year" \
    -d nickname="${name} Annual Plan" \
    | jq -r .id)

  price_ids_annual+=("$annual_price_id")

  # Create Monthly Price
  monthly_price_id=$(curl -s https://api.stripe.com/v1/prices \
    -u $STRIPE_API_KEY: \
    -H "Stripe-Version: $STRIPE_API_VERSION" \
    -d product="$product_id" \
    -d unit_amount="$price_monthly" \
    -d currency="usd" \
    -d recurring[interval]="month" \
    -d nickname="${name} Monthly Plan" \
    | jq -r .id)

  price_ids_monthly+=("$monthly_price_id")

  echo "Created $name plan with product ID: $product_id"
  echo "Annual price ID: $annual_price_id"
  echo "Monthly price ID: $monthly_price_id"
}

# Function to configure the Customer Portal
configure_customer_portal() {
  local product_price_args=""
  for i in "${!product_ids[@]}"; do
    product_price_args+="-d features[subscription_update][products][][product]=${product_ids[$i]} "
    product_price_args+="-d features[subscription_update][products][][prices][]=${price_ids_monthly[$i]} "
    product_price_args+="-d features[subscription_update][products][][prices][]=${price_ids_annual[$i]} "
  done

  response=$(curl -s -w "\n%{http_code}" https://api.stripe.com/v1/billing_portal/configurations \
    -u $STRIPE_API_KEY: \
    -H "Stripe-Version: $STRIPE_API_VERSION" \
    -X POST \
    -d business_profile[headline]="Manage your subscription" \
    -d business_profile[privacy_policy_url]="https://oitd.org/privacy" \
    -d business_profile[terms_of_service_url]="https://oitd.org/terms" \
    -d features[customer_update][allowed_updates][]=name \
    -d features[customer_update][allowed_updates][]=address \
    -d features[customer_update][enabled]=true \
    -d features[invoice_history][enabled]=true \
    -d features[payment_method_update][enabled]=true \
    -d features[subscription_cancel][enabled]=true \
    -d features[subscription_update][enabled]=true \
    -d features[subscription_update][default_allowed_updates][]=price \
    -d features[subscription_update][proration_behavior]="create_prorations" \
    $product_price_args \
    -d default_return_url="https://oitd.org/account")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ $http_code -eq 200 ]; then
    echo "Customer Portal configured successfully"
  else
    echo "Error configuring Customer Portal. HTTP Code: $http_code"
    echo "Response body:"
    echo "$body"
    exit 1
  fi
}

# Create Individual Users Plan
create_product "Individual Users" "Smart project management and collaboration features to boost your productivity." 500 5500 1 5 1 5

# Create Small Business Plan
create_product "Small Business" "Professional project management tools for small organizations to enhance collaboration." 2500 27500 5 25 5 25

# Create Enterprise Plan
create_product "Enterprise" "Secure and reliable project management solutions with customization options." 50000 550000 50 500 50 500

# Configure Customer Portal
configure_customer_portal

echo "Product IDs:"
for id in "${product_ids[@]}"; do
  echo $id
done

echo "Monthly Price IDs:"
for id in "${price_ids_monthly[@]}"; do
  echo $id
done

echo "Annual Price IDs:"
for id in "${price_ids_annual[@]}"; do
  echo $id
done

echo "Stripe Products, Prices, and Customer Portal setup completed!"
