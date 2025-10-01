#!/bin/bash

# Load environment variables from the .env.local file
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo ".env.local file not found. Please create one with the required STRIPE_WEBHOOK_SECRET and STRIPE_API_KEY."
  exit 1
fi

# Check if STRIPE_WEBHOOK_SECRET is set
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "STRIPE_WEBHOOK_SECRET is not set. Please provide it in the .env.local file."
  exit 1
fi

# Check if STRIPE_API_KEY is set
if [ -z "$STRIPE_API_KEY" ]; then
  echo "STRIPE_API_KEY is not set. Please provide it in the .env.local file."
  exit 1
fi

# While developing with stripe sdk, you can use:
# window.location = "https://docs.stripe.com/api/events/types" ; [...document.body.getElementsByClassName("⚙ rs12 as1a7 as17e as17d as158 as1a8 as11s ⚙oaj2dp")].map(x => x.innerText)
# to get the list used below

curl --location "https://api.stripe.com/v1/webhook_endpoints/$STRIPE_WEBHOOK_SECRET" \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header "Authorization: Bearer $STRIPE_API_KEY" \
--data-urlencode 'enabled_events%5B%5D=charge.captured' \
--data-urlencode 'enabled_events%5B%5D=charge.expired' \
--data-urlencode 'enabled_events%5B%5D=charge.failed' \
--data-urlencode 'enabled_events%5B%5D=charge.pending' \
--data-urlencode 'enabled_events%5B%5D=charge.refunded' \
--data-urlencode 'enabled_events%5B%5D=charge.succeeded' \
--data-urlencode 'enabled_events%5B%5D=charge.updated' \
--data-urlencode 'enabled_events%5B%5D=charge.dispute.closed' \
--data-urlencode 'enabled_events%5B%5D=charge.dispute.created' \
--data-urlencode 'enabled_events%5B%5D=charge.dispute.funds_reinstated' \
--data-urlencode 'enabled_events%5B%5D=charge.dispute.funds_withdrawn' \
--data-urlencode 'enabled_events%5B%5D=charge.dispute.updated' \
--data-urlencode 'enabled_events%5B%5D=credit_note.created' \
--data-urlencode 'enabled_events%5B%5D=credit_note.updated' \
--data-urlencode 'enabled_events%5B%5D=credit_note.voided' \
--data-urlencode 'enabled_events%5B%5D=customer.created' \
--data-urlencode 'enabled_events%5B%5D=customer.deleted' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.created' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.deleted' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.paused' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.pending_update_applied' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.pending_update_expired' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.resumed' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.trial_will_end' \
--data-urlencode 'enabled_events%5B%5D=customer.subscription.updated' \
--data-urlencode 'enabled_events%5B%5D=customer.tax_id.created' \
--data-urlencode 'enabled_events%5B%5D=customer.tax_id.deleted' \
--data-urlencode 'enabled_events%5B%5D=customer.tax_id.updated' \
--data-urlencode 'enabled_events%5B%5D=customer.updated' \
--data-urlencode 'enabled_events%5B%5D=invoice.created' \
--data-urlencode 'enabled_events%5B%5D=invoice.deleted' \
--data-urlencode 'enabled_events%5B%5D=invoice.finalized' \
--data-urlencode 'enabled_events%5B%5D=invoice.finalization_failed' \
--data-urlencode 'enabled_events%5B%5D=invoice.marked_uncollectible' \
--data-urlencode 'enabled_events%5B%5D=invoice.paid' \
--data-urlencode 'enabled_events%5B%5D=invoice.payment_action_required' \
--data-urlencode 'enabled_events%5B%5D=invoice.payment_failed' \
--data-urlencode 'enabled_events%5B%5D=invoice.payment_succeeded' \
--data-urlencode 'enabled_events%5B%5D=invoice.sent' \
--data-urlencode 'enabled_events%5B%5D=invoice.upcoming' \
--data-urlencode 'enabled_events%5B%5D=invoice.updated' \
--data-urlencode 'enabled_events%5B%5D=invoice.voided' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.amount_capturable_updated' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.canceled' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.created' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.partially_funded' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.payment_failed' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.processing' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.requires_action' \
--data-urlencode 'enabled_events%5B%5D=payment_intent.succeeded' \
--data-urlencode 'enabled_events%5B%5D=payment_method.attached' \
--data-urlencode 'enabled_events%5B%5D=payment_method.automatically_updated' \
--data-urlencode 'enabled_events%5B%5D=payment_method.detached' \
--data-urlencode 'enabled_events%5B%5D=payment_method.updated' \
--data-urlencode 'enabled_events%5B%5D=plan.created' \
--data-urlencode 'enabled_events%5B%5D=plan.deleted' \
--data-urlencode 'enabled_events%5B%5D=plan.updated' \
--data-urlencode 'enabled_events%5B%5D=price.created' \
--data-urlencode 'enabled_events%5B%5D=price.deleted' \
--data-urlencode 'enabled_events%5B%5D=price.updated' \
--data-urlencode 'enabled_events%5B%5D=product.created' \
--data-urlencode 'enabled_events%5B%5D=product.deleted' \
--data-urlencode 'enabled_events%5B%5D=product.updated' \
--data-urlencode 'enabled_events%5B%5D=setup_intent.canceled' \
--data-urlencode 'enabled_events%5B%5D=setup_intent.created' \
--data-urlencode 'enabled_events%5B%5D=setup_intent.requires_action' \
--data-urlencode 'enabled_events%5B%5D=setup_intent.setup_failed' \
--data-urlencode 'enabled_events%5B%5D=setup_intent.succeeded' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.aborted' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.canceled' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.completed' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.created' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.expiring' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.released' \
--data-urlencode 'enabled_events%5B%5D=subscription_schedule.updated'
