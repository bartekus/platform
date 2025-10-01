import { secret } from 'encore.dev/config';
import Stripe from 'stripe';
import { z } from 'zod';

// Define secrets
export const STRIPE_API_KEY = secret('STRIPE_API_KEY');
export const STRIPE_WEBHOOK_SECRET = secret('STRIPE_WEBHOOK_SECRET');
export const STRIPE_API_VERSION = secret('STRIPE_API_VERSION');
export const LOGTO_APP_API_EVENT_WEBHOOK_SIGNING_KEY = secret('LOGTO_APP_API_EVENT_WEBHOOK_SIGNING_KEY');
export const LOGTO_DOMAIN = secret('LOGTO_DOMAIN');
export const LOGTO_MANAGEMENT_API_APPLICATION_SECRET = secret('LOGTO_MANAGEMENT_API_APPLICATION_SECRET');

// Define config
export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
  defaultCurrency: string;
  allowedCurrencies: string[];
}

const configSchema = z.object({
  secretKey: z.string().min(1),
  webhookSecret: z.string().min(1),
  apiVersion: z.string().min(1),
  defaultCurrency: z.string().length(3),
  allowedCurrencies: z.array(z.string().length(3)),
});

export const config = configSchema.parse({
  secretKey: STRIPE_API_KEY(),
  webhookSecret: STRIPE_WEBHOOK_SECRET(),
  apiVersion: STRIPE_API_VERSION(),
  defaultCurrency: 'usd',
  allowedCurrencies: ['usd', 'eur', 'gbp'],
});

// Initialize Stripe with the correct type
const stripe = new Stripe(STRIPE_API_KEY(), {
  apiVersion: STRIPE_API_VERSION() as Stripe.StripeConfig['apiVersion'],
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000,
});

export { stripe };
