import { Stripe } from 'stripe';
import {
  PortalConfiguration,
  RefundReason,
  RefundStatus,
  StripePaymentMethodBillingDetails,
  StripePaymentMethodCard,
  StripeSubscriptionScheduleCurrentPhase,
} from './stripe.interface';

/**
 * Format amount for zero-decimal currencies
 */
export const formatStripeAmount = (amount: number, currency: string): number => {
  const zeroDecimalCurrencies = ['jpy', 'vnd', 'krw'];
  return zeroDecimalCurrencies.includes(currency.toLowerCase()) ? amount : amount * 100;
};

/**
 * Format Stripe error message
 */
export const getStripeErrorMessage = (error: unknown): string => {
  if (error instanceof Stripe.errors.StripeError) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Convert Unix timestamp to ISO date string
 */
export const unixToIso = (timestamp: number): string => {
  return new Date(timestamp * 1000).toISOString();
};

/**
 * Convert ISO date string to Unix timestamp
 */
export const isoToUnix = (date: string): number => {
  return Math.floor(new Date(date).getTime() / 1000);
};

/**
 * Type guard for Stripe Customer
 */
export const isStripeCustomer = (obj: unknown): obj is Stripe.Customer => {
  return (obj as any)?.object === 'customer';
};

/**
 * Type guard for Stripe Subscription
 */
export const isStripeSubscription = (obj: unknown): obj is Stripe.Subscription => {
  return (obj as any)?.object === 'subscription';
};

/**
 * Type guard for Stripe Payment Intent
 */
export const isStripePaymentIntent = (obj: unknown): obj is Stripe.PaymentIntent => {
  return (obj as any)?.object === 'payment_intent';
};

/**
 * Type guard for Stripe Invoice
 */
export const isStripeInvoice = (obj: unknown): obj is Stripe.Invoice => {
  return (obj as any)?.object === 'invoice';
};

// Add type guards for new event types
export const isStripePrice = (obj: unknown): obj is Stripe.Price => {
  return (obj as any)?.object === 'price';
};

export const isStripeProduct = (obj: unknown): obj is Stripe.Product => {
  return (obj as any)?.object === 'product';
};

export const isStripeCoupon = (obj: unknown): obj is Stripe.Coupon => {
  return (obj as any)?.object === 'coupon';
};

export const isStripePromotionCode = (obj: unknown): obj is Stripe.PromotionCode => {
  return (obj as any)?.object === 'promotion_code';
};

export const isStripePaymentMethod = (obj: unknown): obj is Stripe.PaymentMethod => {
  return (obj as any)?.object === 'payment_method';
};

export const isStripeRefund = (obj: any): obj is Stripe.Refund => {
  return obj?.object === 'refund';
};

export const isStripeUsageRecord = (obj: any): obj is Stripe.UsageRecord => {
  return obj?.object === 'usage_record';
};

// Add helper functions
export const createOrUpdatePortalConfig = async (config: any) => {
  return {
    business_profile: config.businessProfile,
    features: config.features,
    default_return_url: config.defaultReturnUrl,
  };
};

// Add helper functions for type casting
export const ensureStripeMetadata = (metadata: Stripe.Metadata | null): Record<string, any> => {
  return metadata || {};
};

// Add helper function to handle subscription status
export const ensureSubscriptionStatus = (status: string): Stripe.Subscription.Status => {
  const validStatuses: Stripe.Subscription.Status[] = [
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'paused',
  ];
  return validStatuses.includes(status as Stripe.Subscription.Status) ? (status as Stripe.Subscription.Status) : 'incomplete';
};

// Add helper function to handle payment method types
export const ensurePaymentMethodType = (type: string): Stripe.PaymentMethod.Type => {
  const validTypes: Stripe.PaymentMethod.Type[] = ['card', 'sepa_debit', 'us_bank_account', 'bacs_debit', 'au_becs_debit'];
  return validTypes.includes(type as Stripe.PaymentMethod.Type) ? (type as Stripe.PaymentMethod.Type) : 'card';
};

// Add helper function to handle refund status
export const ensureRefundStatus = (status: string | null): RefundStatus => {
  const validStatuses: RefundStatus[] = ['succeeded', 'pending', 'failed', 'canceled'];
  return status && validStatuses.includes(status as RefundStatus) ? (status as RefundStatus) : 'failed';
};

// Add helper function to handle refund reason
export const ensureRefundReason = (reason: Stripe.Refund.Reason | null | undefined): RefundReason | undefined => {
  if (!reason) return undefined;
  return reason as RefundReason;
};

// Add helper function to handle tax ID type
export const ensureTaxIdType = (type: string): Stripe.TaxId.Type => {
  const validTypes: Stripe.TaxId.Type[] = [
    'au_abn',
    'eu_vat',
    'in_gst',
    'no_vat',
    'nz_gst',
    'za_vat',
    // Add other valid types as needed
  ];
  return validTypes.includes(type as Stripe.TaxId.Type) ? (type as Stripe.TaxId.Type) : 'eu_vat';
};

export const ensureSubscriptionPhaseItems = (
  items: Array<{ price: string | Stripe.Price | Stripe.DeletedPrice; quantity?: number }>,
): Array<{ price: string; quantity?: number }> => {
  return items.map((item) => ({
    price: typeof item.price === 'string' ? item.price : 'id' in item.price ? item.price.id : item.price,
    quantity: item.quantity,
  }));
};

export const ensureCurrentPhaseItems = (
  phase: Stripe.SubscriptionSchedule.Phase | null,
): Array<{ price: string; quantity?: number }> | undefined => {
  if (!phase || !phase.items) return undefined;
  return phase.items.map((item) => ({
    price: typeof item.price === 'string' ? item.price : 'id' in item.price ? item.price.id : item.price,
    quantity: item.quantity,
  }));
};

// Add helper function to handle subscription schedule status
export const ensureSubscriptionScheduleStatus = (
  status: string,
): 'active' | 'canceled' | 'completed' | 'not_started' | 'released' => {
  const validStatuses = ['active', 'canceled', 'completed', 'not_started', 'released'];
  return validStatuses.includes(status) ? (status as any) : 'not_started';
};

// Add helper function to handle payment method card
export const ensurePaymentMethodCard = (card: Stripe.PaymentMethod.Card | null): StripePaymentMethodCard | undefined => {
  if (!card) return undefined;
  return {
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  };
};

// Add helper function to handle payment method billing details
export const ensurePaymentMethodBillingDetails = (
  billingDetails: Stripe.PaymentMethod.BillingDetails,
): StripePaymentMethodBillingDetails => {
  return {
    address: billingDetails.address
      ? {
          city: billingDetails.address.city,
          country: billingDetails.address.country,
          line1: billingDetails.address.line1,
          line2: billingDetails.address.line2,
          postalCode: billingDetails.address.postal_code,
          state: billingDetails.address.state,
        }
      : undefined,
    email: billingDetails.email,
    name: billingDetails.name,
    phone: billingDetails.phone,
  };
};

// Add helper function to handle tax ID verification status
export const ensureTaxIdVerificationStatus = (verification: Stripe.TaxId.Verification | null): Stripe.TaxId.Verification.Status => {
  return verification?.status || 'unverified';
};

// Add helper functions for type safety
export const ensureSubscriptionItemQuantity = (quantity: number | undefined): number | null => {
  return typeof quantity === 'undefined' ? null : quantity;
};

export const ensureRefundPaymentIntent = (paymentIntent: string | Stripe.PaymentIntent | null): string => {
  if (typeof paymentIntent === 'string') return paymentIntent;
  if (paymentIntent?.id) return paymentIntent.id;
  throw new Error('Invalid payment intent');
};

export const ensureCustomerId = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string => {
  if (typeof customer === 'string') return customer;
  if (customer?.id) return customer.id;
  throw new Error('Invalid customer ID');
};

export const ensureUsageRecordAction = (action: string | undefined): 'increment' | 'set' => {
  return action === 'set' ? 'set' : 'increment';
};

export const ensureCouponCurrency = (currency: string | null): string | undefined => {
  return currency === null ? undefined : currency;
};

// Add helper function for portal configuration
export const createPortalConfiguration = (config: PortalConfiguration) => {
  return {
    business_profile: config.businessProfile,
    features: config.features,
    default_return_url: config.defaultReturnUrl,
  };
};

export const ensureCurrentPhase = (
  phase: Stripe.SubscriptionSchedule.CurrentPhase,
): StripeSubscriptionScheduleCurrentPhase | null => {
  if (!phase || !isCurrentPhase(phase)) return null;

  return {
    startDate: new Date(phase.start_date * 1000),
    endDate: phase.end_date ? new Date(phase.end_date * 1000) : undefined,
    items: phase.items.map((item) => ({
      price: typeof item.price === 'string' ? item.price : item.price.id,
      quantity: item.quantity ?? null,
    })),
    add_invoice_items:
      phase.add_invoice_items?.map((item) => ({
        price: typeof item.price === 'string' ? item.price : item.price.id,
        quantity: item.quantity ?? null,
      })) ?? null,
    application_fee_percent: phase.application_fee_percent ?? null,
    billing_cycle_anchor: phase.billing_cycle_anchor ?? null,
    billing_thresholds: phase.billing_thresholds
      ? {
          amount_gte: phase.billing_thresholds.amount_gte ?? 0,
          reset_billing_cycle_anchor: !!phase.billing_thresholds.reset_billing_cycle_anchor,
        }
      : null,
    collection_method: phase.collection_method ?? null,
    coupon: typeof phase.coupon === 'string' ? phase.coupon : (phase.coupon?.id ?? null),
    default_payment_method:
      typeof phase.default_payment_method === 'string' ? phase.default_payment_method : (phase.default_payment_method?.id ?? null),
    invoice_settings: phase.invoice_settings
      ? {
          days_until_due: phase.invoice_settings.days_until_due ?? 0,
        }
      : null,
    metadata: phase.metadata ?? null,
    proration_behavior: phase.proration_behavior ?? null,
    transfer_data: phase.transfer_data
      ? {
          destination:
            typeof phase.transfer_data.destination === 'string'
              ? phase.transfer_data.destination
              : phase.transfer_data.destination.id,
          amount_percent: phase.transfer_data.amount_percent ?? 0,
        }
      : null,
    trial_end: phase.trial_end ? new Date(phase.trial_end * 1000) : null,
  };
};

/**
 * Type guard for Stripe Subscription Schedule Phase
 */
export const isCurrentPhase = (phase: unknown): phase is Stripe.SubscriptionSchedule.Phase => {
  return (phase as any)?.start_date !== undefined && Array.isArray((phase as any)?.items);
};
