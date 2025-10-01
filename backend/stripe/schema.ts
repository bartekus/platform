import * as p from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Core Stripe tables
export const stripeCustomers = p.pgTable('stripe_customers', {
  id: p.text('id').primaryKey(), // Stripe customer ID
  accountId: p.text('account_id').notNull(),
  email: p.text('email'),
  name: p.text('name'),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  deleted: p.boolean('deleted').notNull().default(false),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow(),
});

export const stripeSubscriptions = p.pgTable('stripe_subscriptions', {
  id: p.text('id').primaryKey(), // Stripe subscription ID
  customerId: p
    .text('customer_id')
    .notNull()
    .references(() => stripeCustomers.id),
  status: p.text('status').notNull(),
  priceId: p.text('price_id'),
  quantity: p.integer('quantity'),
  cancelAtPeriodEnd: p.boolean('cancel_at_period_end').notNull().default(false),
  currentPeriodStart: p.timestamp('current_period_start'),
  currentPeriodEnd: p.timestamp('current_period_end'),
  cancelAt: p.timestamp('cancel_at'),
  canceledAt: p.timestamp('canceled_at'),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow(),
});

// Add price and product tables
export const stripeProducts = p.pgTable('stripe_products', {
  id: p.text('id').primaryKey(),
  name: p.text('name').notNull(),
  description: p.text('description'),
  active: p.boolean('active').notNull().default(true),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow(),
});

export const stripePrices = p.pgTable('stripe_prices', {
  id: p.text('id').primaryKey(),
  productId: p
    .text('product_id')
    .notNull()
    .references(() => stripeProducts.id),
  currency: p.text('currency').notNull(),
  unitAmount: p.integer('unit_amount'),
  type: p.text('type', { enum: ['one_time', 'recurring'] }).notNull(),
  recurring: p.jsonb('recurring').$type<{
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  } | null>(),
  active: p.boolean('active').notNull().default(true),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow(),
});

// Add tables for payment methods, refunds, and usage records
export const stripePaymentMethods = p.pgTable('stripe_payment_methods', {
  id: p.text('id').primaryKey(),
  customerId: p
    .text('customer_id')
    .notNull()
    .references(() => stripeCustomers.id),
  type: p.text('type').notNull(),
  card: p.jsonb('card').$type<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null>(),
  billingDetails: p.jsonb('billing_details').notNull().$type<{
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
  }>(),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow(),
});

export const stripeRefunds = p.pgTable('stripe_refunds', {
  id: p.text('id').primaryKey(),
  amount: p.integer('amount').notNull(),
  currency: p.text('currency').notNull(),
  paymentIntentId: p.text('payment_intent_id').notNull(),
  status: p.text('status', { enum: ['succeeded', 'pending', 'failed', 'canceled'] }).notNull(),
  reason: p.text('reason', { enum: ['duplicate', 'fraudulent', 'requested_by_customer'] }),
  failure_reason: p.text('failure_reason'),
  receiptNumber: p.text('receipt_number'),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
});

export const stripeUsageRecords = p.pgTable('stripe_usage_records', {
  id: p.text('id').primaryKey(),
  subscriptionItemId: p.text('subscription_item_id').notNull(),
  quantity: p.integer('quantity').notNull(),
  timestamp: p.timestamp('timestamp').notNull(),
  action: p.text('action', { enum: ['increment', 'set'] }).notNull(),
  metadata: p.jsonb('metadata').notNull().$type<Record<string, any>>(),
});

// Add type inference for models
export type StripeCustomer = InferSelectModel<typeof stripeCustomers>;
export type NewStripeCustomer = InferInsertModel<typeof stripeCustomers>;
export type StripeSubscription = InferSelectModel<typeof stripeSubscriptions>;
export type NewStripeSubscription = InferInsertModel<typeof stripeSubscriptions>;
export type StripeProduct = InferSelectModel<typeof stripeProducts>;
export type NewStripeProduct = InferInsertModel<typeof stripeProducts>;
export type StripePrice = InferSelectModel<typeof stripePrices>;
export type NewStripePrice = InferInsertModel<typeof stripePrices>;
export type StripePaymentMethod = InferSelectModel<typeof stripePaymentMethods>;
export type NewStripePaymentMethod = InferInsertModel<typeof stripePaymentMethods>;
export type StripeRefund = InferSelectModel<typeof stripeRefunds>;
export type NewStripeRefund = InferInsertModel<typeof stripeRefunds>;
export type StripeUsageRecord = InferSelectModel<typeof stripeUsageRecords>;
export type NewStripeUsageRecord = InferInsertModel<typeof stripeUsageRecords>;

// Add relations
export const stripeSubscriptionsRelations = relations(stripeSubscriptions, ({ one }) => ({
  customer: one(stripeCustomers, {
    fields: [stripeSubscriptions.customerId],
    references: [stripeCustomers.id],
  }),
}));

export const stripePricesRelations = relations(stripePrices, ({ one }) => ({
  product: one(stripeProducts, {
    fields: [stripePrices.productId],
    references: [stripeProducts.id],
  }),
}));

// Add payment method relations
export const stripePaymentMethodsRelations = relations(stripePaymentMethods, ({ one }) => ({
  customer: one(stripeCustomers, {
    fields: [stripePaymentMethods.customerId],
    references: [stripeCustomers.id],
  }),
}));
