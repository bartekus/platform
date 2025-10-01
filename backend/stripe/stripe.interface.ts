import { Stripe } from 'stripe';
import { getSubscriptionUrl } from './stripe.controller';

// Core Response Types
export interface StripeResponse<T> {
  success: boolean;
  result?: T;
  error?: {
    message: string;
    code?: string;
  };
  hasMore?: boolean;
  nextPageToken?: string;
}

export interface StripePaginatedResponse<T> extends StripeResponse<T[]> {
  hasMore: boolean;
  nextPageToken?: string;
}

// Webhook Types
export type WebhookEventObject =
  | Stripe.Customer
  | Stripe.Subscription
  | Stripe.Price
  | Stripe.Product
  | Stripe.PaymentIntent
  | Stripe.Invoice
  | Stripe.PaymentMethod
  | Stripe.Refund
  | Stripe.UsageRecord
  | Stripe.SetupIntent
  | Stripe.TaxId
  | Stripe.SubscriptionSchedule
  | Stripe.SubscriptionItem;

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: {
    object: WebhookEventObject;
    previous_attributes?: Partial<WebhookEventObject>;
  };
}

// Core Entity Types
export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, any>;
  accountId: string;
  deleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  priceId: string | null;
  quantity: number | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Refund Types
export type RefundStatus = 'succeeded' | 'pending' | 'failed' | 'canceled';
export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';
export type RefundResponseReason = RefundReason | 'expired_uncaptured_charge';

export interface StripeRefund {
  id: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  status: RefundStatus;
  reason?: RefundResponseReason;
  receiptNumber?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Add type guards for webhook events
export const isPaymentMethodEvent = (type: WebhookEventType): boolean => {
  return [
    WebhookEventType.PaymentMethodAttached,
    WebhookEventType.PaymentMethodDetached,
    WebhookEventType.PaymentMethodUpdated,
  ].includes(type);
};

export const isRefundEvent = (type: WebhookEventType): boolean => {
  return [WebhookEventType.RefundCreated, WebhookEventType.RefundUpdated, WebhookEventType.RefundFailed].includes(type);
};

export const isUsageRecordEvent = (type: WebhookEventType): boolean => {
  return [WebhookEventType.UsageRecordCreated, WebhookEventType.UsageRecordUpdated].includes(type);
};

export interface Paginated {
  /** Total number of results */
  count: number;
  /** Number of results per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page number */
  current: number;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, any>;
}

export interface StripePrice {
  id: string;
  productId: string;
  currency: string;
  unitAmount: number | null;
  type: 'one_time' | 'recurring';
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  } | null;
  active: boolean;
  metadata: Record<string, any>;
}

// Add sync types
export interface SyncOptions {
  startingAfter?: string;
  limit?: number;
  created?: {
    gt?: number; // Greater than timestamp
    gte?: number; // Greater than or equal timestamp
    lt?: number; // Less than timestamp
    lte?: number; // Less than or equal timestamp
  };
  endingBefore?: string;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  syncedCount: number;
  failedCount: number;
  errors?: Array<{ message: string; stack?: string }>;
  resource: SyncableResource;
}

export type SyncableResource = 'customers' | 'subscriptions' | 'products' | 'prices';

export interface StripeTaxId {
  id: string;
  customerId: string;
  type: TaxIdType;
  value: string;
  verificationStatus: TaxIdVerificationStatus;
  metadata: Record<string, any>;
}

export interface StripeSetupIntent {
  id: string;
  customerId: string;
  status: string;
  paymentMethodTypes: string[];
  usage: string;
  metadata: Record<string, any>;
}

// Update subscription schedule types
export interface StripeSubscriptionSchedulePhase {
  startDate: Date;
  endDate?: Date;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  metadata?: Record<string, any>;
}

// Add a new interface for the Stripe API phase
export interface StripeSubscriptionSchedulePhaseAPI {
  start_date: number;
  end_date?: number;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  metadata?: Record<string, any>;
}

// Update the current phase interface
export interface StripeSubscriptionScheduleCurrentPhase {
  startDate: Date;
  endDate?: Date;
  items: Array<{
    price: string;
    quantity: number | null;
  }>;
  add_invoice_items?: Array<{
    price: string;
    quantity: number | null;
  }> | null;
  application_fee_percent: number | null;
  billing_cycle_anchor: 'automatic' | 'phase_start' | null;
  billing_thresholds: {
    amount_gte: number;
    reset_billing_cycle_anchor: boolean;
  } | null;
  collection_method: 'charge_automatically' | 'send_invoice' | null;
  coupon: string | null;
  default_payment_method: string | null;
  invoice_settings: {
    days_until_due: number;
  } | null;
  metadata: Record<string, any> | null;
  proration_behavior: 'always_invoice' | 'create_prorations' | 'none' | null;
  transfer_data: {
    destination: string;
    amount_percent: number;
  } | null;
  trial_end: Date | null;
}

// Add a type guard for CurrentPhase
export const isCurrentPhase = (phase: unknown): phase is Stripe.SubscriptionSchedule.Phase => {
  return (phase as any)?.start_date !== undefined;
};

export interface StripeSubscriptionSchedule {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  status: 'active' | 'canceled' | 'completed' | 'not_started' | 'released';
  phases: StripeSubscriptionSchedulePhase[];
  currentPhase: StripeSubscriptionScheduleCurrentPhase | null;
  metadata: Record<string, any>;
}

// Add subscription item interface
export interface StripeSubscriptionItem {
  id: string;
  subscriptionId: string;
  priceId: string;
  quantity: number | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Update payment method types
export interface StripePaymentMethodCard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface StripePaymentMethodBillingDetails {
  address?: {
    city: string | null;
    country: string | null;
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    state: string | null;
  };
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface StripePaymentMethod {
  id: string;
  customerId: string;
  type: Stripe.PaymentMethod.Type;
  card?: StripePaymentMethodCard;
  billingDetails: StripePaymentMethodBillingDetails;
  metadata: Record<string, any>;
}

// Add usage record interface
export interface StripeUsageRecord {
  id: string;
  subscriptionItemId: string;
  quantity: number;
  timestamp: Date;
  action: 'increment' | 'set';
  metadata: Record<string, any>;
}

// Add promotion code interfaces
export interface StripePromotionCode {
  id: string;
  code: string;
  couponId: string;
  active: boolean;
  customerId?: string;
  expiresAt?: Date;
  maxRedemptions?: number;
  timesRedeemed: number;
  metadata: Record<string, any>;
}

// Add Coupon types
export type StripeCouponDuration = 'forever' | 'once' | 'repeating';

export interface StripeCoupon {
  id: string;
  name: string | null;
  amountOff: number | null;
  percentOff: number | null;
  currency: string | null;
  duration: StripeCouponDuration;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  valid: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface StripeCreateCouponRequest {
  name?: string;
  amountOff?: number;
  percentOff?: number;
  currency?: string;
  duration: StripeCouponDuration;
  durationInMonths?: number;
  maxRedemptions?: number;
  metadata?: Record<string, any>;
}

export interface StripeCreatePromotionCodeRequest {
  couponId: string;
  code?: string;
  active?: boolean;
  customerId?: string;
  expiresAt?: Date;
  maxRedemptions?: number;
  metadata?: Record<string, any>;
}

// Add type guards for coupon and promotion code events
export const isCouponEvent = (type: WebhookEventType): boolean => {
  return [WebhookEventType.CouponCreated, WebhookEventType.CouponUpdated, WebhookEventType.CouponDeleted].includes(type);
};

export const isPromotionCodeEvent = (type: WebhookEventType): boolean => {
  return [WebhookEventType.PromotionCodeCreated, WebhookEventType.PromotionCodeUpdated].includes(type);
};

// Add helper type for metadata
export type StripeMetadata = Record<string, any> | null;

// Update service types to handle nullable metadata
export interface StripeServiceTypes {
  metadata: Required<Record<string, any>>;
}

// Helper function to handle metadata
export const ensureMetadata = (metadata: Stripe.Metadata | null): Record<string, any> => {
  return metadata || {};
};

// Update subscription status type
export type SubscriptionStatus = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';

// Update payment method type
export type PaymentMethodType = Stripe.PaymentMethod.Type;

// Update usage record types
export type UsageRecordAction = 'increment' | 'set';

// Update coupon types
export type CouponDuration = Stripe.Coupon.Duration;

export interface PortalConfiguration {
  id?: string;
  businessProfile?: {
    headline?: string;
    privacy_policy_url?: string;
    terms_of_service_url?: string;
  };
  features?: {
    customer_update?: {
      allowed_updates?: Array<'email' | 'address' | 'phone' | 'tax_id'>;
      enabled: boolean;
    };
    invoice_history?: {
      enabled: boolean;
    };
    payment_method_update?: {
      enabled: boolean;
    };
    subscription_cancel?: {
      enabled: boolean;
      mode?: 'at_period_end' | 'immediately';
      proration_behavior?: 'create_prorations' | 'none';
    };
    subscription_pause?: {
      enabled: boolean;
    };
  };
  defaultReturnUrl?: string;
}

// Add missing helper functions
export const ensureNonNullMetadata = (metadata: Stripe.Metadata | null): Record<string, any> => {
  return metadata || {};
};

export const ensureNonNullQuantity = (quantity: number | undefined): number | null => {
  return typeof quantity === 'undefined' ? null : quantity;
};

export const ensureNonNullString = (value: string | null): string | undefined => {
  return value === null ? undefined : value;
};

// Add helper function for portal configuration
export const createPortalConfiguration = (config: PortalConfiguration) => {
  return {
    business_profile: config.businessProfile,
    features: config.features,
    default_return_url: config.defaultReturnUrl,
  };
};

// Add type for subscription schedule phase
export interface StripeSubscriptionSchedulePhaseInput {
  startDate: number;
  endDate?: number;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  metadata?: Record<string, any>;
}

// Add these type definitions
export type TaxIdType =
  | 'au_abn'
  | 'eu_vat'
  | 'in_gst'
  | 'no_vat'
  | 'nz_gst'
  | 'za_vat'
  | 'br_cnpj'
  | 'br_cpf'
  | 'ca_bn'
  | 'ca_qst'
  | 'ch_vat'
  | 'cl_tin'
  | 'es_cif'
  | 'gb_vat'
  | 'hk_br'
  | 'id_npwp'
  | 'il_vat'
  | 'jp_cn'
  | 'jp_rn'
  | 'kr_brn'
  | 'li_uid'
  | 'mx_rfc'
  | 'my_frp'
  | 'my_itn'
  | 'my_sst'
  | 'ru_inn'
  | 'ru_kpp'
  | 'sa_vat'
  | 'sg_gst'
  | 'sg_uen'
  | 'th_vat'
  | 'tw_vat'
  | 'us_ein'
  | 'za_vat';

export type TaxIdVerificationStatus = 'pending' | 'verified' | 'unverified';

export type StripeRefundReason = RefundReason;

// Add API request types
export interface StripeCreatePaymentMethodRequest {
  customerId: string;
  paymentMethodId: string;
}

export interface StripeUpdatePaymentMethodRequest {
  billingDetails?: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postalCode?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

export interface StripeCreateRefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
}

export interface StripeCreateUsageRecordRequest {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
  action?: 'increment' | 'set';
  metadata?: Record<string, any>;
}

// Add webhook event type enum
export enum WebhookEventType {
  CustomerCreated = 'customer.created',
  CustomerUpdated = 'customer.updated',
  CustomerDeleted = 'customer.deleted',
  SubscriptionCreated = 'customer.subscription.created',
  SubscriptionUpdated = 'customer.subscription.updated',
  SubscriptionDeleted = 'customer.subscription.deleted',
  PriceCreated = 'price.created',
  PriceUpdated = 'price.updated',
  PriceDeleted = 'price.deleted',
  ProductCreated = 'product.created',
  ProductUpdated = 'product.updated',
  ProductDeleted = 'product.deleted',
  PaymentSucceeded = 'payment_intent.succeeded',
  PaymentFailed = 'payment_intent.payment_failed',
  InvoicePaid = 'invoice.paid',
  InvoicePaymentFailed = 'invoice.payment_failed',
  SetupIntentSucceeded = 'setup_intent.succeeded',
  SetupIntentFailed = 'setup_intent.failed',
  TaxIdCreated = 'tax_id.created',
  TaxIdUpdated = 'tax_id.updated',
  TaxIdDeleted = 'tax_id.deleted',
  SubscriptionScheduleCreated = 'subscription_schedule.created',
  SubscriptionScheduleUpdated = 'subscription_schedule.updated',
  SubscriptionScheduleCanceled = 'subscription_schedule.canceled',
  SubscriptionScheduleCompleted = 'subscription_schedule.completed',
  SubscriptionScheduleReleased = 'subscription_schedule.released',
  SubscriptionItemCreated = 'subscription_item.created',
  SubscriptionItemUpdated = 'subscription_item.updated',
  SubscriptionItemDeleted = 'subscription_item.deleted',
  PaymentMethodAttached = 'payment_method.attached',
  PaymentMethodDetached = 'payment_method.detached',
  PaymentMethodUpdated = 'payment_method.updated',
  RefundCreated = 'refund.created',
  RefundUpdated = 'refund.updated',
  RefundFailed = 'refund.failed',
  UsageRecordCreated = 'usage_record.created',
  UsageRecordUpdated = 'usage_record.updated',
  PromotionCodeCreated = 'promotion_code.created',
  PromotionCodeUpdated = 'promotion_code.updated',
  CouponCreated = 'coupon.created',
  CouponUpdated = 'coupon.updated',
  CouponDeleted = 'coupon.deleted',
  PlanCreated = 'plan.created',
  PlanUpdated = 'plan.updated',
  PlanDeleted = 'plan.deleted',
  SetupIntentRequiresAction = 'setup_intent.requires_action',
  SetupIntentRequiresConfirmation = 'setup_intent.requires_confirmation',
  PaymentMethodAutomaticallyUpdated = 'payment_method.automatically_updated',
  PaymentMethodRequiresAction = 'payment_method.requires_action',
  InvoiceFinalized = 'invoice.finalized',
  InvoiceMarkedUncollectible = 'invoice.marked_uncollectible',
  InvoiceSent = 'invoice.sent',
  InvoiceUpcoming = 'invoice.upcoming',
  InvoiceVoided = 'invoice.voided',
}

// Add request types
export interface CreateCustomerRequest {
  email: string;
  accountId: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
}

export interface CreatePriceRequest {
  productId: string;
  unitAmount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  };
}

// Add more request types
export interface ListProductsRequest {
  active?: boolean;
  limit?: number;
  startingAfter?: string;
}

export interface ListPricesRequest {
  productId?: string;
  active?: boolean;
  limit?: number;
  startingAfter?: string;
}

export interface CreateBillingPortalSessionRequest {
  customerId: string;
  returnUrl: string;
  configuration?: BillingPortalConfiguration | string;
}

export interface GetSubscriptionUrlRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}

export interface GetSubscriptionUrl {
  url: string;
}

export interface CreateCheckoutSessionRequest {
  priceId: string;
  customerId?: string;
  line_items?: Array<{
    price: string;
    quantity?: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription' | 'payment';
  quantity?: number;
  metadata?: Record<string, any>;
  allowPromotionCodes?: boolean;
  collectPhoneNumber?: boolean;
  collectShippingAddress?: boolean;
  paymentMethodTypes?: Array<'card' | 'us_bank_account' | 'sepa_debit'>;
  subscriptionData?: {
    trialPeriodDays?: number;
    metadata?: Record<string, any>;
  };
}

export interface UpdateSubscriptionRequest {
  id: string;
  priceId?: string;
  quantity?: number;
  cancelAtPeriodEnd?: boolean;
  paymentBehavior?: 'allow_incomplete' | 'error_if_incomplete' | 'pending_if_incomplete';
  proration?: boolean;
}

export interface CreateSetupIntentRequest {
  customerId: string;
  paymentMethodTypes?: string[];
  usage?: 'off_session' | 'on_session';
  metadata?: Record<string, any>;
}

export interface CreateTaxIdRequest {
  customerId: string;
  type: TaxIdType;
  value: string;
}

export interface CreateSubscriptionScheduleRequest {
  customerId: string;
  startDate?: number;
  phases: Array<{
    startDate: number;
    endDate?: number;
    items: Array<{ price: string; quantity?: number }>;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionItemRequest {
  subscriptionId: string;
  priceId: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionItemRequest {
  id: string;
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

export interface CreateRefundRequest {
  paymentIntent: string;
  amount?: number;
  reason?: RefundReason;
  metadata?: Record<string, any>;
}

export interface CreateUsageRecordRequest {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
  action?: 'increment' | 'set';
  metadata?: Record<string, any>;
}

export interface ListUsageRecordsRequest {
  subscriptionItemId: string;
  limit?: number;
  startingAfter?: string;
}

// Add missing response types
export interface StripeBillingPortalSession {
  id: string;
  object: 'billing_portal.session';
  configuration: string | BillingPortalConfiguration;
  created: number;
  customer: string;
  livemode: boolean;
  locale: string | null;
  on_behalf_of: string | null;
  return_url: string | null;
  url: string;
}

export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  url: string | null;
  customer?: string | null;
  payment_status: string;
  status: string | null;
  subscription?: string | null;
  success_url: string | null;
  cancel_url: string | null;
}

// Add missing request types
export interface ListRefundsRequest {
  paymentIntentId?: string;
  limit?: number;
  startingAfter?: string;
}

export interface UpdateRefundRequest {
  id: string;
  metadata?: Record<string, any>;
}

export interface ListPromotionCodesRequest {
  active?: boolean;
  code?: string;
  coupon?: string;
  customer?: string;
  limit?: number;
  startingAfter?: string;
}

export interface UpdatePromotionCodeRequest {
  id: string;
  active?: boolean;
  metadata?: Record<string, any>;
}

export interface ListCouponsRequest {
  limit?: number;
  startingAfter?: string;
}

export interface SyncStripeDataRequest {
  resources?: SyncableResource[];
  options?: SyncOptions;
}

// Define portal configuration types
export interface BillingPortalFeatures {
  payment_method_update?: { enabled: boolean };
  subscription_cancel?: { enabled: boolean; mode?: 'at_period_end' | 'immediately' };
  subscription_pause?: { enabled: boolean };
  invoice_history?: { enabled: boolean };
}

export interface BillingPortalConfiguration {
  features?: BillingPortalFeatures;
  business_profile?: {
    headline?: string;
    privacy_policy_url?: string;
    terms_of_service_url?: string;
  };
  default_return_url?: string;
}
