import Stripe from 'stripe';
import { secret } from 'encore.dev/config';
import { SQL, eq, gt, and } from 'drizzle-orm';

import { db } from './database';
import { stripeCustomers, stripeSubscriptions, stripeProducts, stripePrices, stripeRefunds } from './schema';
import {
  StripeCustomer,
  StripeSubscription,
  StripeProduct,
  StripePrice,
  WebhookEvent,
  StripeSetupIntent,
  StripeTaxId,
  StripeSubscriptionSchedule,
  StripeSubscriptionItem,
  StripePaymentMethod,
  StripeRefund,
  StripeUsageRecord,
  StripeCoupon,
  StripePromotionCode,
  StripeCreatePromotionCodeRequest,
  StripeCreateCouponRequest,
  ensureMetadata,
  PortalConfiguration,
  createPortalConfiguration,
  SubscriptionStatus,
  RefundStatus,
  RefundReason,
  StripeBillingPortalSession,
  StripeCheckoutSession,
  CreateBillingPortalSessionRequest,
  CreateCheckoutSessionRequest,
  StripeCouponDuration,
  TaxIdType,
  BillingPortalConfiguration,
  TaxIdVerificationStatus,
} from './stripe.interface';
import {
  isStripeCustomer,
  isStripeSubscription,
  isStripePaymentIntent,
  isStripeInvoice,
  isStripePrice,
  isStripeProduct,
  isStripeCoupon,
  isStripePromotionCode,
  isStripePaymentMethod,
  isStripeRefund,
  isStripeUsageRecord,
  ensureCustomerId,
  ensureSubscriptionStatus,
  ensureSubscriptionItemQuantity,
  ensureStripeMetadata,
  ensureRefundStatus,
  ensureRefundReason,
  createOrUpdatePortalConfig,
  ensureTaxIdType,
  ensureTaxIdVerificationStatus,
  ensureSubscriptionPhaseItems,
  ensureCurrentPhaseItems,
  ensureRefundPaymentIntent,
  ensureCouponCurrency,
} from './stripe.utils';
import { handleStripeError } from './stripe.errors';
import { WebhookEventType } from './stripe.interface';
import { SyncOptions, SyncResult, SyncableResource } from './stripe.interface';
import { monitorStripeOperation, stripeLogger, stripeMetrics } from './monitoring.service';
import { ensureCurrentPhase } from './stripe.utils';
import { logto } from '~encore/clients';
import { LOGTO_DOMAIN } from './stripe.config';

const STRIPE_API_KEY = secret('STRIPE_API_KEY');
const STRIPE_API_VERSION = secret('STRIPE_API_VERSION');

const stripeInstance = new Stripe(STRIPE_API_KEY(), {
  // @ts-ignore: so that using any other version than the latest will not result in error
  apiVersion: STRIPE_API_VERSION(),
});

const StripeService = {
  customers: {
    create: async (data: { email: string; accountId: string }): Promise<StripeCustomer> => {
      try {
        const customer = await stripeInstance.customers.create({
          email: data.email,
          metadata: { accountId: data.accountId },
        });

        const [dbCustomer] = await db
          .insert(stripeCustomers)
          .values({
            id: customer.id,
            accountId: data.accountId,
            email: customer.email,
            name: customer.name,
            metadata: customer.metadata as Record<string, any>,
          })
          .returning();

        return dbCustomer as StripeCustomer;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    get: async (id: string): Promise<StripeCustomer | null> => {
      try {
        const [customer] = await db.select().from(stripeCustomers).where(eq(stripeCustomers.id, id)).limit(1);

        return customer || null;
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  subscriptions: {
    create: async (data: { customerId: string; priceId: string }): Promise<StripeSubscription> => {
      try {
        const subscription = await stripeInstance.subscriptions.create({
          customer: data.customerId,
          items: [{ price: data.priceId }],
        });

        const [dbSubscription] = await db
          .insert(stripeSubscriptions)
          .values({
            id: subscription.id,
            customerId: ensureCustomerId(subscription.customer),
            status: subscription.status,
            priceId: subscription.items.data[0]?.price.id,
            quantity: ensureSubscriptionItemQuantity(subscription.items.data[0]?.quantity),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            metadata: ensureStripeMetadata(subscription.metadata),
            createdAt: new Date(subscription.created * 1000),
            updatedAt: new Date(),
          })
          .returning();

        return {
          ...dbSubscription,
          status: ensureSubscriptionStatus(dbSubscription.status),
          currentPeriodStart: dbSubscription.currentPeriodStart || new Date(),
          currentPeriodEnd: dbSubscription.currentPeriodEnd || new Date(),
          metadata: ensureStripeMetadata(dbSubscription.metadata),
        } as StripeSubscription;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    cancel: async (subscriptionId: string): Promise<StripeSubscription> => {
      try {
        const subscription = await stripeInstance.subscriptions.cancel(subscriptionId);

        const [dbSubscription] = await db
          .update(stripeSubscriptions)
          .set({
            status: subscription.status,
            canceledAt: new Date(subscription.canceled_at! * 1000),
            updatedAt: new Date(),
          })
          .where(eq(stripeSubscriptions.id, subscriptionId))
          .returning();

        return {
          ...dbSubscription,
          status: ensureSubscriptionStatus(dbSubscription.status),
          currentPeriodStart: dbSubscription.currentPeriodStart || new Date(),
          currentPeriodEnd: dbSubscription.currentPeriodEnd || new Date(),
          metadata: ensureStripeMetadata(dbSubscription.metadata),
        } as StripeSubscription;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    update: async (
      subscriptionId: string,
      data: {
        priceId?: string;
        quantity?: number;
        cancelAtPeriodEnd?: boolean;
        paymentBehavior?: 'allow_incomplete' | 'error_if_incomplete' | 'pending_if_incomplete';
        proration?: boolean;
      },
    ): Promise<StripeSubscription> => {
      try {
        const subscription = await stripeInstance.subscriptions.update(subscriptionId, {
          items: [
            {
              price: data.priceId,
              quantity: data.quantity,
            },
          ],
          cancel_at_period_end: data.cancelAtPeriodEnd,
          payment_behavior: data.paymentBehavior,
          proration_behavior: data.proration ? 'create_prorations' : 'none',
        });

        const [dbSubscription] = await db
          .update(stripeSubscriptions)
          .set({
            priceId: subscription.items.data[0]?.price.id,
            quantity: subscription.items.data[0]?.quantity || null,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(stripeSubscriptions.id, subscriptionId))
          .returning();

        return {
          ...dbSubscription,
          status: ensureSubscriptionStatus(dbSubscription.status),
          currentPeriodStart: dbSubscription.currentPeriodStart || new Date(),
          currentPeriodEnd: dbSubscription.currentPeriodEnd || new Date(),
          metadata: ensureStripeMetadata(dbSubscription.metadata),
        } as StripeSubscription;
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  webhooks: {
    handleCustomerEvent: async (event: WebhookEvent) => {
      return monitorStripeOperation('handleCustomerEvent', async () => {
        if (!isStripeCustomer(event.data.object)) {
          throw new Error(`Invalid customer event object for event ${event.type}`);
        }

        const customer = event.data.object as Stripe.Customer;
        stripeLogger.info(`Processing customer event ${event.type}`, {
          customerId: customer.id,
          eventType: event.type,
        });

        if ('deleted' in customer && customer.deleted) {
          stripeLogger.info(`Customer ${customer.id} marked as deleted`);
          await db.update(stripeCustomers).set({ deleted: true }).where(eq(stripeCustomers.id, customer.id));
          return;
        }

        await db
          .insert(stripeCustomers)
          .values({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            metadata: ensureMetadata(customer.metadata),
            accountId: customer.metadata?.accountId as string,
          })
          .onConflictDoUpdate({
            target: stripeCustomers.id,
            set: {
              email: customer.email,
              name: customer.name,
              metadata: ensureMetadata(customer.metadata),
              updatedAt: new Date(),
            },
          });
      });
    },

    handleSubscriptionEvent: async (event: WebhookEvent) => {
      return monitorStripeOperation('handleSubscriptionEvent', async () => {
        if (!isStripeSubscription(event.data.object)) {
          throw new Error('Invalid subscription event object');
        }

        const subscription = event.data.object;

        // First update our database
        await db
          .insert(stripeSubscriptions)
          .values({
            id: subscription.id,
            customerId: subscription.customer as string,
            status: subscription.status,
            priceId: subscription.items.data[0]?.price.id,
            quantity: subscription.items.data[0]?.quantity || null,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            metadata: subscription.metadata as Record<string, any>,
          })
          .onConflictDoUpdate({
            target: stripeSubscriptions.id,
            set: {
              status: subscription.status,
              priceId: subscription.items.data[0]?.price.id,
              quantity: subscription.items.data[0]?.quantity || null,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              metadata: subscription.metadata as Record<string, any>,
              updatedAt: new Date(),
            },
          });

        // Get the customer to find associated account ID
        const [customer] = await db
          .select()
          .from(stripeCustomers)
          .where(eq(stripeCustomers.id, subscription.customer as string))
          .limit(1);

        if (!customer?.accountId) {
          stripeLogger.warn('Customer not found or missing accountId', {
            customerId: subscription.customer,
            subscriptionId: subscription.id,
          });
          return;
        }

        try {
          const accessToken = await logto.getManagementApiToken();
          const logtoUrl = `https://${LOGTO_DOMAIN()}`;

          // First, get the current custom data
          const userResponse = await fetch(`${logtoUrl}/api/users/${customer.accountId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
            },
          });

          if (!userResponse.ok) {
            throw new Error(`Failed to fetch user data: ${userResponse.status}`);
          }

          const userData = await userResponse.json();
          console.log(' ');
          console.log('userData', userData);
          console.log(' ');

          stripeLogger.info('Current custom data:', {
            currentCustomData: userData.customData,
            accountId: customer.accountId,
          });

          // Update with merged data
          const updateResponse = await fetch(`${logtoUrl}/api/users/${customer.accountId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customData: {
                stripeCustomerId: userData.customData.stripeCustomerId,
                subscription: {
                  id: subscription.id,
                  status: subscription.status,
                  priceId: subscription.items.data[0]?.price.id,
                  currentPeriodEnd: subscription.current_period_end,
                }
              }
            })
          });

          if (!updateResponse.ok) {
            const responseText = await updateResponse.text();
            stripeLogger.error('Failed to update Logto user custom data:', {
              status: updateResponse.status,
              response: responseText,
              accountId: customer.accountId,
            });
          } else {
            stripeLogger.info('Successfully updated Logto user subscription status');
          }
        } catch (error) {
          stripeLogger.error('Failed to update Logto user custom data:', {
            error,
            accountId: customer.accountId,
            subscriptionId: subscription.id,
          });
        }
      });
    },

    handlePriceEvent: async (event: WebhookEvent) => {
      try {
        const price = event.data.object as Stripe.Price;
        if (event.type === WebhookEventType.PriceDeleted) {
          await db.update(stripePrices).set({ active: false }).where(eq(stripePrices.id, price.id));
          return;
        }

        await db
          .insert(stripePrices)
          .values({
            id: price.id,
            productId: price.product as string,
            currency: price.currency,
            unitAmount: price.unit_amount,
            type: price.type,
            recurring: price.recurring,
            active: price.active,
            metadata: ensureMetadata(price.metadata),
          })
          .onConflictDoUpdate({
            target: stripePrices.id,
            set: {
              currency: price.currency,
              unitAmount: price.unit_amount,
              type: price.type,
              recurring: price.recurring,
              active: price.active,
              metadata: ensureMetadata(price.metadata),
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    handleProductEvent: async (event: WebhookEvent) => {
      try {
        const product = event.data.object as Stripe.Product;
        if (event.type === WebhookEventType.ProductDeleted) {
          await db.update(stripeProducts).set({ active: false }).where(eq(stripeProducts.id, product.id));
          return;
        }

        await db
          .insert(stripeProducts)
          .values({
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: ensureMetadata(product.metadata),
          })
          .onConflictDoUpdate({
            target: stripeProducts.id,
            set: {
              name: product.name,
              description: product.description,
              active: product.active,
              metadata: ensureMetadata(product.metadata),
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    handlePaymentEvent: async (event: WebhookEvent) => {
      if (!isStripePaymentIntent(event.data.object)) {
        throw new Error(`Invalid payment intent event object for event ${event.type}`);
      }

      try {
        const paymentIntent = event.data.object;

        // Find associated subscription
        if (paymentIntent.invoice) {
          const invoice = await stripeInstance.invoices.retrieve(paymentIntent.invoice as string);
          if (invoice.subscription) {
            await db
              .update(stripeSubscriptions)
              .set({
                status: event.type === WebhookEventType.PaymentSucceeded ? 'active' : 'past_due',
                updatedAt: new Date(),
              })
              .where(eq(stripeSubscriptions.id, invoice.subscription as string));
          }
        }
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    handleInvoiceEvent: async (event: WebhookEvent) => {
      if (!isStripeInvoice(event.data.object)) {
        throw new Error(`Invalid invoice event object for event ${event.type}`);
      }

      try {
        const invoice = event.data.object;

        if (invoice.subscription) {
          const status = event.type === WebhookEventType.InvoicePaid ? 'active' : 'past_due';

          await db
            .update(stripeSubscriptions)
            .set({
              status,
              currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
              updatedAt: new Date(),
            })
            .where(eq(stripeSubscriptions.id, invoice.subscription as string));
        }
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    handlePaymentMethodEvent: async (event: WebhookEvent) => {
      const startTime = Date.now();
      try {
        if (!isStripePaymentMethod(event.data.object)) {
          throw new Error(`Invalid payment method event object for event ${event.type}`);
        }

        await monitorStripeOperation('handlePaymentMethodEvent', async () => {
          const paymentMethod = event.data.object as Stripe.PaymentMethod;

          switch (event.type) {
            case WebhookEventType.PaymentMethodAttached:
            case WebhookEventType.PaymentMethodUpdated:
              stripeLogger.info(`Payment method ${paymentMethod.id} ${event.type}`, {
                customerId: paymentMethod.customer,
                type: paymentMethod.type,
              });
              break;
            case WebhookEventType.PaymentMethodDetached:
              stripeLogger.info(`Payment method ${paymentMethod.id} detached`, {
                customerId: paymentMethod.customer,
                type: paymentMethod.type,
              });
              break;
            default:
              stripeLogger.warn(`Unhandled payment method event type: ${event.type}`);
          }
        });

        stripeMetrics.webhookLatency.observe(Date.now() - startTime);
      } catch (error) {
        stripeMetrics.webhookErrors.inc({
          event_type: event.type,
          error_type: error instanceof Error ? error.name : 'unknown',
        });
        stripeLogger.error('Error processing payment method webhook:', error, {
          eventType: event.type,
          paymentMethodId: event.data.object.id,
        });
        throw error;
      }
    },

    handleRefundEvent: async (event: WebhookEvent) => {
      const startTime = Date.now();
      try {
        const refund = event.data.object as Stripe.Refund;
        if (!isStripeRefund(refund)) {
          throw new Error(`Invalid refund event object for event ${event.type}`);
        }

        await monitorStripeOperation('handleRefundEvent', async () => {
          switch (event.type) {
            case WebhookEventType.RefundCreated:
            case WebhookEventType.RefundUpdated:
              stripeLogger.info(`Refund ${refund.id} ${event.type}`, {
                amount: refund.amount,
                currency: refund.currency,
                status: ensureRefundStatus(refund.status),
              });
              break;
            case WebhookEventType.RefundFailed:
              await db
                .update(stripeRefunds)
                .set({
                  status: 'failed',
                  failure_reason: refund.failure_reason || null,
                })
                .where(eq(stripeRefunds.id, refund.id));
              break;
            default:
              stripeLogger.warn(`Unhandled refund event type: ${event.type}`);
          }
        });

        stripeMetrics.webhookLatency.observe(Date.now() - startTime);
      } catch (error) {
        stripeMetrics.webhookErrors.inc({
          event_type: event.type,
          error_type: error instanceof Error ? error.name : 'unknown',
        });
        stripeLogger.error('Error processing refund webhook:', error, {
          eventType: event.type,
          refundId: event.data.object.id,
        });
        throw error;
      }
    },

    handleUsageRecordEvent: async (event: WebhookEvent) => {
      const startTime = Date.now();
      try {
        const usageRecord = event.data.object as Stripe.UsageRecord;
        if (!isStripeUsageRecord(usageRecord)) {
          throw new Error(`Invalid usage record event object for event ${event.type}`);
        }

        await monitorStripeOperation('handleUsageRecordEvent', async () => {
          switch (event.type) {
            case WebhookEventType.UsageRecordCreated:
            case WebhookEventType.UsageRecordUpdated:
              stripeLogger.info(`Usage record ${usageRecord.id} ${event.type}`, {
                subscriptionItem: usageRecord.subscription_item,
                quantity: usageRecord.quantity,
                timestamp: new Date((usageRecord.timestamp || 0) * 1000),
              });
              break;
            default:
              stripeLogger.warn(`Unhandled usage record event type: ${event.type}`);
          }
        });

        stripeMetrics.webhookLatency.observe(Date.now() - startTime);
      } catch (error) {
        stripeMetrics.webhookErrors.inc({
          event_type: event.type,
          error_type: error instanceof Error ? error.name : 'unknown',
        });
        stripeLogger.error('Error processing usage record webhook:', error, {
          eventType: event.type,
          usageRecordId: event.data.object.id,
        });
        throw error;
      }
    },

    handleCouponEvent: async (event: WebhookEvent) => {
      const startTime = Date.now();
      try {
        // Cast to unknown first, then to Coupon
        const coupon = event.data.object as unknown as Stripe.Coupon;
        if (!isStripeCoupon(coupon)) {
          throw new Error(`Invalid coupon event object for event ${event.type}`);
        }

        await monitorStripeOperation('handleCouponEvent', async () => {
          switch (event.type) {
            case WebhookEventType.CouponCreated:
            case WebhookEventType.CouponUpdated:
              stripeLogger.info(`Coupon ${coupon.id} ${event.type}`, {
                name: coupon.name || undefined,
                amountOff: coupon.amount_off || undefined,
                percentOff: coupon.percent_off || undefined,
                duration: coupon.duration as Stripe.Coupon.Duration,
              });
              break;
            case WebhookEventType.CouponDeleted:
              stripeLogger.info(`Coupon ${coupon.id} deleted`);
              break;
            default:
              stripeLogger.warn(`Unhandled coupon event type: ${event.type}`);
          }
        });

        stripeMetrics.webhookLatency.observe(Date.now() - startTime);
      } catch (error) {
        stripeMetrics.webhookErrors.inc({
          event_type: event.type,
          error_type: error instanceof Error ? error.name : 'unknown',
        });
        stripeLogger.error('Error processing coupon webhook:', error, {
          eventType: event.type,
          couponId: event.data.object.id,
        });
        throw error;
      }
    },

    handlePromotionCodeEvent: async (event: WebhookEvent) => {
      const startTime = Date.now();
      try {
        // Cast to unknown first, then to PromotionCode
        const promotionCode = event.data.object as unknown as Stripe.PromotionCode;
        if (!isStripePromotionCode(promotionCode)) {
          throw new Error(`Invalid promotion code event object for event ${event.type}`);
        }

        await monitorStripeOperation('handlePromotionCodeEvent', async () => {
          switch (event.type) {
            case WebhookEventType.PromotionCodeCreated:
            case WebhookEventType.PromotionCodeUpdated:
              stripeLogger.info(`Promotion code ${promotionCode.id} ${event.type}`, {
                code: promotionCode.code,
                couponId: promotionCode.coupon.id,
                active: promotionCode.active,
                customerId: typeof promotionCode.customer === 'string' ? promotionCode.customer : undefined,
                expiresAt: promotionCode.expires_at ? new Date(promotionCode.expires_at * 1000) : undefined,
              });
              break;
            default:
              stripeLogger.warn(`Unhandled promotion code event type: ${event.type}`);
          }
        });

        stripeMetrics.webhookLatency.observe(Date.now() - startTime);
      } catch (error) {
        stripeMetrics.webhookErrors.inc({
          event_type: event.type,
          error_type: error instanceof Error ? error.name : 'unknown',
        });
        stripeLogger.error('Error processing promotion code webhook:', error, {
          eventType: event.type,
          promotionCodeId: event.data.object.id,
        });
        throw error;
      }
    },

    handlePlanEvent: async (event: WebhookEvent) => {
      try {
        // Cast to unknown first, then to Plan
        const plan = event.data.object as unknown as Stripe.Plan;

        // Plans are a legacy concept in Stripe, now using Prices
        // We'll handle them as prices
        if (event.type === WebhookEventType.PlanCreated || event.type === WebhookEventType.PlanUpdated) {
          await db
            .insert(stripePrices)
            .values({
              id: plan.id,
              productId: plan.product as string,
              currency: plan.currency,
              unitAmount: plan.amount,
              type: 'recurring',
              recurring: {
                interval: plan.interval,
                interval_count: plan.interval_count,
              },
              active: true,
              metadata: ensureStripeMetadata(plan.metadata),
            })
            .onConflictDoUpdate({
              target: stripePrices.id,
              set: {
                currency: plan.currency,
                unitAmount: plan.amount,
                recurring: {
                  interval: plan.interval,
                  interval_count: plan.interval_count,
                },
                active: true,
                metadata: ensureStripeMetadata(plan.metadata),
                updatedAt: new Date(),
              },
            });
        } else if (event.type === WebhookEventType.PlanDeleted) {
          await db.update(stripePrices).set({ active: false }).where(eq(stripePrices.id, plan.id));
        }
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    handleBillingPortalConfigurationEvent: async (event: WebhookEvent) => {
      // These events don't require database updates
      stripeLogger.info(`Billing portal configuration ${event.type}`, {
        configId: event.data.object.id,
      });
    },
  },

  products: {
    create: async (data: { name: string; description?: string }): Promise<StripeProduct> => {
      try {
        const product = await stripeInstance.products.create({
          name: data.name,
          description: data.description,
        });

        const [dbProduct] = await db
          .insert(stripeProducts)
          .values({
            id: product.id,
            name: product.name,
            description: product.description,
            active: product.active,
            metadata: product.metadata,
          })
          .returning();

        return dbProduct;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    get: async (id: string): Promise<StripeProduct | null> => {
      try {
        const [product] = await db.select().from(stripeProducts).where(eq(stripeProducts.id, id)).limit(1);

        return product || null;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (params?: { active?: boolean; limit?: number; startingAfter?: string }): Promise<StripeProduct[]> => {
      let conditions: SQL[] = [];

      if (params?.active !== undefined) {
        conditions.push(eq(stripeProducts.active, params.active));
      }

      if (params?.startingAfter) {
        conditions.push(gt(stripeProducts.id, params.startingAfter));
      }

      const results = await db
        .select()
        .from(stripeProducts)
        .where(and(...conditions))
        .limit(params?.limit || 50);

      return results.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
      }));
    },
  },

  prices: {
    create: async (data: {
      productId: string;
      unitAmount: number;
      currency: string;
      recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count?: number;
      };
    }): Promise<StripePrice> => {
      try {
        const price = await stripeInstance.prices.create({
          product: data.productId,
          unit_amount: data.unitAmount,
          currency: data.currency,
          recurring: data.recurring,
        });

        const [dbPrice] = await db
          .insert(stripePrices)
          .values({
            id: price.id,
            productId: price.product as string,
            currency: price.currency,
            unitAmount: price.unit_amount,
            type: price.type,
            recurring: price.recurring,
            active: price.active,
            metadata: price.metadata,
          })
          .returning();

        return dbPrice;
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    get: async (id: string): Promise<StripePrice | null> => {
      const [price] = await db.select().from(stripePrices).where(eq(stripePrices.id, id)).limit(1);

      if (!price) return null;

      return {
        id: price.id,
        productId: price.productId,
        currency: price.currency,
        unitAmount: price.unitAmount,
        type: price.type,
        recurring: price.recurring,
        active: price.active,
        metadata: price.metadata,
      };
    },

    list: async (params?: {
      productId?: string;
      active?: boolean;
      limit?: number;
      startingAfter?: string;
    }): Promise<StripePrice[]> => {
      let conditions: SQL[] = [];

      if (params?.productId) {
        conditions.push(eq(stripePrices.productId, params.productId));
      }

      if (params?.active !== undefined) {
        conditions.push(eq(stripePrices.active, params.active));
      }

      if (params?.startingAfter) {
        conditions.push(gt(stripePrices.id, params.startingAfter));
      }

      const results = await db
        .select()
        .from(stripePrices)
        .where(and(...conditions))
        .limit(params?.limit || 50);

      return results.map((price) => ({
        id: price.id,
        productId: price.productId,
        currency: price.currency,
        unitAmount: price.unitAmount,
        type: price.type,
        recurring: price.recurring,
        active: price.active,
        metadata: price.metadata,
      }));
    },
  },

  billingPortal: {
    createSession: async (params: CreateBillingPortalSessionRequest): Promise<StripeBillingPortalSession> => {
      const session = await stripeInstance.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
        ...(typeof params.configuration === 'string'
          ? { configuration: params.configuration }
          : params.configuration
            ? { configuration_data: params.configuration }
            : {}),
      });

      if (!session.url) {
        throw new Error('Failed to create billing portal session: missing URL');
      }

      return {
        id: session.id,
        object: session.object as 'billing_portal.session',
        configuration:
          typeof session.configuration === 'string'
            ? session.configuration
            : (session.configuration as unknown as BillingPortalConfiguration),
        created: session.created,
        customer: session.customer,
        livemode: session.livemode,
        locale: session.locale,
        on_behalf_of: session.on_behalf_of,
        return_url: session.return_url,
        url: session.url,
      };
    },
  },

  checkout: {
    create: async (params: CreateCheckoutSessionRequest): Promise<StripeCheckoutSession> => {
      const session = await stripeInstance.checkout.sessions.create({
        customer: params.customerId,
        line_items: [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ],
        mode: params.mode || 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: params.allowPromotionCodes,
        payment_method_types: params.paymentMethodTypes,
        subscription_data: params.subscriptionData,
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session: missing URL');
      }

      return {
        id: session.id,
        object: session.object as 'checkout.session',
        url: session.url,
        customer: session.customer?.toString() || null,
        payment_status: session.payment_status,
        status: session.status,
        subscription: session.subscription?.toString() || null,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
      };
    },
  },

  sync: {
    backfill: async (params: {
      resources?: SyncableResource[];
      options?: SyncOptions;
    }): Promise<Record<SyncableResource, SyncResult>> => {
      return monitorStripeOperation('sync_backfill', async () => {
        const results: Record<SyncableResource, SyncResult> = {
          customers: { success: true, syncedCount: 0, failedCount: 0, resource: 'customers' },
          subscriptions: { success: true, syncedCount: 0, failedCount: 0, resource: 'subscriptions' },
          products: { success: true, syncedCount: 0, failedCount: 0, resource: 'products' },
          prices: { success: true, syncedCount: 0, failedCount: 0, resource: 'prices' },
        };

        const resources = params.resources || ['customers', 'subscriptions', 'products', 'prices'];
        const options = params.options || {};

        for (const resource of resources) {
          try {
            switch (resource) {
              case 'customers':
                await syncCustomers(options, results.customers);
                break;
              case 'subscriptions':
                await syncSubscriptions(options, results.subscriptions);
                break;
              case 'products':
                await syncProducts(options, results.products);
                break;
              case 'prices':
                await syncPrices(options, results.prices);
                break;
            }
          } catch (error) {
            results[resource].success = false;
            results[resource].message = error instanceof Error ? error.message : 'Unknown error';
            stripeLogger.error(`Failed to sync ${resource}`, error);
          }
        }

        return results;
      });
    },
  },

  setupIntents: {
    create: async (data: {
      customerId: string;
      paymentMethodTypes?: string[];
      usage?: 'on_session' | 'off_session';
      metadata?: Record<string, any>;
    }): Promise<StripeSetupIntent> => {
      try {
        const setupIntent = await stripeInstance.setupIntents.create({
          customer: data.customerId,
          payment_method_types: data.paymentMethodTypes,
          usage: data.usage,
          metadata: data.metadata,
        });

        return {
          id: setupIntent.id,
          customerId: ensureCustomerId(setupIntent.customer),
          status: setupIntent.status,
          paymentMethodTypes: setupIntent.payment_method_types,
          usage: setupIntent.usage,
          metadata: ensureStripeMetadata(setupIntent.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  taxIds: {
    create: async (data: { customerId: string; type: TaxIdType; value: string }): Promise<StripeTaxId> => {
      try {
        const taxId = await stripeInstance.customers.createTaxId(data.customerId, {
          type: data.type as Stripe.TaxIdCreateParams.Type,
          value: data.value,
        });

        return {
          id: taxId.id,
          customerId: ensureCustomerId(taxId.customer),
          type: taxId.type as TaxIdType,
          value: taxId.value,
          verificationStatus: (taxId.verification?.status as TaxIdVerificationStatus) || 'unverified',
          metadata: ensureStripeMetadata({}),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (customerId: string): Promise<StripeTaxId[]> => {
      try {
        const taxIds = await stripeInstance.customers.listTaxIds(customerId);
        return taxIds.data.map((taxId) => ({
          id: taxId.id,
          customerId: ensureCustomerId(taxId.customer),
          type: taxId.type as TaxIdType,
          value: taxId.value,
          verificationStatus: (taxId.verification?.status as TaxIdVerificationStatus) || 'unverified',
          metadata: ensureStripeMetadata({}),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    delete: async (customerId: string, taxIdId: string): Promise<void> => {
      try {
        await stripeInstance.customers.deleteTaxId(customerId, taxIdId);
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  subscriptionSchedules: {
    create: async (params: {
      customerId: string;
      phases: Array<{
        startDate: Date;
        endDate?: Date;
        items: Array<{ price: string; quantity?: number }>;
        metadata?: Record<string, any>;
      }>;
      metadata?: Record<string, any>;
    }): Promise<StripeSubscriptionSchedule> => {
      try {
        const schedule = await stripeInstance.subscriptionSchedules.create({
          customer: params.customerId,
          phases: params.phases.map((phase) => ({
            start_date: Math.floor(phase.startDate.getTime() / 1000),
            end_date: phase.endDate ? Math.floor(phase.endDate.getTime() / 1000) : undefined,
            items: phase.items,
            metadata: phase.metadata,
          })),
          metadata: params.metadata,
        });

        return {
          id: schedule.id,
          customerId: schedule.customer as string,
          subscriptionId: schedule.subscription as string | null,
          status: schedule.status,
          phases: schedule.phases.map((phase) => ({
            startDate: new Date(phase.start_date * 1000),
            endDate: phase.end_date ? new Date(phase.end_date * 1000) : undefined,
            items: ensureSubscriptionPhaseItems(phase.items),
            metadata: ensureStripeMetadata(phase.metadata),
          })),
          currentPhase: schedule.current_phase ? ensureCurrentPhase(schedule.current_phase) : null,
          metadata: ensureStripeMetadata(schedule.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    cancel: async (scheduleId: string): Promise<StripeSubscriptionSchedule> => {
      try {
        const schedule = await stripeInstance.subscriptionSchedules.cancel(scheduleId);

        return {
          id: schedule.id,
          customerId: ensureCustomerId(schedule.customer),
          subscriptionId: schedule.subscription as string | null,
          status: schedule.status,
          phases: schedule.phases.map((phase) => ({
            startDate: new Date(phase.start_date * 1000),
            endDate: phase.end_date ? new Date(phase.end_date * 1000) : undefined,
            items: ensureSubscriptionPhaseItems(phase.items),
            metadata: ensureStripeMetadata(phase.metadata),
          })),
          currentPhase: schedule.current_phase ? ensureCurrentPhase(schedule.current_phase) : null,
          metadata: ensureStripeMetadata(schedule.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    release: async (scheduleId: string): Promise<StripeSubscriptionSchedule> => {
      try {
        const schedule = await stripeInstance.subscriptionSchedules.release(scheduleId);

        return {
          id: schedule.id,
          customerId: ensureCustomerId(schedule.customer),
          subscriptionId: schedule.subscription as string | null,
          status: schedule.status,
          phases: schedule.phases.map((phase) => ({
            startDate: new Date(phase.start_date * 1000),
            endDate: phase.end_date ? new Date(phase.end_date * 1000) : undefined,
            items: ensureSubscriptionPhaseItems(phase.items),
            metadata: ensureStripeMetadata(phase.metadata),
          })),
          currentPhase: schedule.current_phase ? ensureCurrentPhase(schedule.current_phase) : null,
          metadata: ensureStripeMetadata(schedule.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  subscriptionItems: {
    create: async (data: {
      subscriptionId: string;
      priceId: string;
      quantity?: number;
      metadata?: Record<string, any>;
    }): Promise<StripeSubscriptionItem> => {
      try {
        const item = await stripeInstance.subscriptionItems.create({
          subscription: data.subscriptionId,
          price: data.priceId,
          quantity: data.quantity,
          metadata: data.metadata,
        });

        return {
          id: item.id,
          subscriptionId: item.subscription,
          priceId: item.price.id,
          quantity: ensureSubscriptionItemQuantity(item.quantity),
          metadata: ensureStripeMetadata(item.metadata),
          createdAt: new Date(item.created * 1000),
          updatedAt: new Date(),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    update: async (
      itemId: string,
      data: {
        priceId?: string;
        quantity?: number;
        metadata?: Record<string, any>;
      },
    ): Promise<StripeSubscriptionItem> => {
      try {
        const item = await stripeInstance.subscriptionItems.update(itemId, {
          price: data.priceId,
          quantity: data.quantity,
          metadata: data.metadata,
        });

        return {
          id: item.id,
          subscriptionId: item.subscription,
          priceId: item.price.id,
          quantity: ensureSubscriptionItemQuantity(item.quantity),
          metadata: ensureStripeMetadata(item.metadata),
          createdAt: new Date(item.created * 1000),
          updatedAt: new Date(),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    delete: async (itemId: string): Promise<void> => {
      try {
        await stripeInstance.subscriptionItems.del(itemId);
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (subscriptionId: string): Promise<StripeSubscriptionItem[]> => {
      try {
        const items = await stripeInstance.subscriptionItems.list({
          subscription: subscriptionId,
        });

        return items.data.map((item) => ({
          id: item.id,
          subscriptionId: item.subscription,
          priceId: item.price.id,
          quantity: ensureSubscriptionItemQuantity(item.quantity),
          metadata: ensureStripeMetadata(item.metadata),
          createdAt: new Date(item.created * 1000),
          updatedAt: new Date(),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  paymentMethods: {
    create: async (data: { customerId: string; paymentMethodId: string }): Promise<StripePaymentMethod> => {
      try {
        const paymentMethod = await stripeInstance.paymentMethods.attach(data.paymentMethodId, { customer: data.customerId });

        return {
          id: paymentMethod.id,
          customerId: ensureCustomerId(paymentMethod.customer),
          type: paymentMethod.type,
          card: paymentMethod.card
            ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
              }
            : undefined,
          billingDetails: {
            address: paymentMethod.billing_details.address
              ? {
                  city: paymentMethod.billing_details.address.city,
                  country: paymentMethod.billing_details.address.country,
                  line1: paymentMethod.billing_details.address.line1,
                  line2: paymentMethod.billing_details.address.line2,
                  postalCode: paymentMethod.billing_details.address.postal_code,
                  state: paymentMethod.billing_details.address.state,
                }
              : undefined,
            email: paymentMethod.billing_details.email,
            name: paymentMethod.billing_details.name,
            phone: paymentMethod.billing_details.phone,
          },
          metadata: ensureStripeMetadata(paymentMethod.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (customerId: string, type: Stripe.PaymentMethod.Type = 'card'): Promise<StripePaymentMethod[]> => {
      try {
        const paymentMethods = await stripeInstance.customers.listPaymentMethods(customerId, {
          type: type as 'card' | 'sepa_debit' | 'us_bank_account',
        });

        return paymentMethods.data.map((method) => ({
          id: method.id,
          customerId: ensureCustomerId(method.customer),
          type: method.type,
          card: method.card
            ? {
                brand: method.card.brand,
                last4: method.card.last4,
                expMonth: method.card.exp_month,
                expYear: method.card.exp_year,
              }
            : undefined,
          billingDetails: {
            address: method.billing_details.address
              ? {
                  city: method.billing_details.address.city,
                  country: method.billing_details.address.country,
                  line1: method.billing_details.address.line1,
                  line2: method.billing_details.address.line2,
                  postalCode: method.billing_details.address.postal_code,
                  state: method.billing_details.address.state,
                }
              : undefined,
            email: method.billing_details.email,
            name: method.billing_details.name,
            phone: method.billing_details.phone,
          },
          metadata: ensureStripeMetadata(method.metadata),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    detach: async (paymentMethodId: string): Promise<void> => {
      try {
        await stripeInstance.paymentMethods.detach(paymentMethodId);
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    update: async (
      paymentMethodId: string,
      data: {
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
      },
    ): Promise<StripePaymentMethod> => {
      try {
        const paymentMethod = await stripeInstance.paymentMethods.update(paymentMethodId, {
          billing_details: data.billingDetails
            ? {
                address: data.billingDetails.address,
                email: data.billingDetails.email,
                name: data.billingDetails.name,
                phone: data.billingDetails.phone,
              }
            : undefined,
          metadata: data.metadata,
        });

        return {
          id: paymentMethod.id,
          customerId: ensureCustomerId(paymentMethod.customer),
          type: paymentMethod.type,
          card: paymentMethod.card
            ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
              }
            : undefined,
          billingDetails: {
            address: paymentMethod.billing_details.address
              ? {
                  city: paymentMethod.billing_details.address.city,
                  country: paymentMethod.billing_details.address.country,
                  line1: paymentMethod.billing_details.address.line1,
                  line2: paymentMethod.billing_details.address.line2,
                  postalCode: paymentMethod.billing_details.address.postal_code,
                  state: paymentMethod.billing_details.address.state,
                }
              : undefined,
            email: paymentMethod.billing_details.email,
            name: paymentMethod.billing_details.name,
            phone: paymentMethod.billing_details.phone,
          },
          metadata: ensureStripeMetadata(paymentMethod.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  refunds: {
    create: async (data: {
      paymentIntent: string;
      amount?: number;
      reason?: Stripe.RefundCreateParams.Reason;
      metadata?: Record<string, any>;
    }): Promise<StripeRefund> => {
      try {
        const refund = await stripeInstance.refunds.create({
          payment_intent: data.paymentIntent,
          amount: data.amount,
          reason: data.reason,
          metadata: data.metadata,
        });

        return {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          paymentIntentId: ensureRefundPaymentIntent(refund.payment_intent),
          status: ensureRefundStatus(refund.status) as RefundStatus,
          reason: refund.reason ? (refund.reason as RefundReason) : undefined,
          receiptNumber: refund.receipt_number || undefined,
          metadata: ensureStripeMetadata(refund.metadata),
          createdAt: new Date(refund.created * 1000),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    retrieve: async (refundId: string): Promise<StripeRefund> => {
      try {
        const refund = await stripeInstance.refunds.retrieve(refundId);

        return {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          paymentIntentId: ensureRefundPaymentIntent(refund.payment_intent),
          status: ensureRefundStatus(refund.status),
          reason: ensureRefundReason(refund.reason),
          receiptNumber: refund.receipt_number || undefined,
          metadata: ensureStripeMetadata(refund.metadata),
          createdAt: new Date(refund.created * 1000),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    update: async (
      refundId: string,
      data: {
        metadata?: Record<string, any>;
      },
    ): Promise<StripeRefund> => {
      try {
        const refund = await stripeInstance.refunds.update(refundId, {
          metadata: data.metadata,
        });

        return {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          paymentIntentId: ensureRefundPaymentIntent(refund.payment_intent),
          status: ensureRefundStatus(refund.status) as RefundStatus,
          reason: refund.reason ? ensureRefundReason(refund.reason) : undefined,
          receiptNumber: refund.receipt_number || undefined,
          metadata: ensureStripeMetadata(refund.metadata),
          createdAt: new Date(refund.created * 1000),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (params?: { limit?: number; startingAfter?: string }): Promise<StripeRefund[]> => {
      try {
        const refunds = await stripeInstance.refunds.list({
          limit: params?.limit,
          starting_after: params?.startingAfter,
        });

        return refunds.data.map((refund) => ({
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          paymentIntentId: ensureRefundPaymentIntent(refund.payment_intent),
          status: ensureRefundStatus(refund.status),
          reason: ensureRefundReason(refund.reason),
          receiptNumber: refund.receipt_number || undefined,
          metadata: ensureStripeMetadata(refund.metadata),
          createdAt: new Date(refund.created * 1000),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  usageRecords: {
    create: async (data: {
      subscriptionItemId: string;
      quantity: number;
      timestamp?: number;
      action?: 'increment' | 'set';
    }): Promise<StripeUsageRecord> => {
      try {
        const usageRecord = await stripeInstance.subscriptionItems.createUsageRecord(data.subscriptionItemId, {
          quantity: data.quantity,
          timestamp: data.timestamp,
          action: data.action,
        });

        return {
          id: usageRecord.id,
          subscriptionItemId: usageRecord.subscription_item,
          quantity: usageRecord.quantity,
          timestamp: new Date(usageRecord.timestamp * 1000),
          action: data.action || 'increment',
          metadata: ensureStripeMetadata({}),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (subscriptionItemId: string, params?: { limit?: number }): Promise<StripeUsageRecord[]> => {
      try {
        const records = await stripeInstance.subscriptionItems.listUsageRecordSummaries(subscriptionItemId, params);

        return records.data.map((record) => ({
          id: record.id,
          subscriptionItemId: record.subscription_item,
          quantity: record.total_usage,
          timestamp: new Date((record.period.start || 0) * 1000),
          action: 'increment',
          metadata: ensureStripeMetadata({}),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },

  coupons: {
    create: async (data: StripeCreateCouponRequest): Promise<StripeCoupon> => {
      try {
        const coupon = await stripeInstance.coupons.create({
          name: data.name,
          amount_off: data.amountOff,
          percent_off: data.percentOff,
          currency: data.currency,
          duration: data.duration,
          duration_in_months: data.durationInMonths,
          max_redemptions: data.maxRedemptions,
          metadata: data.metadata,
        });

        return {
          id: coupon.id,
          name: coupon.name || null,
          amountOff: coupon.amount_off || null,
          percentOff: coupon.percent_off || null,
          currency: coupon.currency || null,
          duration: coupon.duration as StripeCouponDuration,
          durationInMonths: coupon.duration_in_months || null,
          maxRedemptions: coupon.max_redemptions || null,
          timesRedeemed: coupon.times_redeemed,
          valid: coupon.valid,
          metadata: ensureStripeMetadata(coupon.metadata),
          createdAt: new Date(coupon.created * 1000),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    retrieve: async (couponId: string): Promise<StripeCoupon> => {
      try {
        const coupon = await stripeInstance.coupons.retrieve(couponId);

        return {
          id: coupon.id,
          name: coupon.name || null,
          amountOff: coupon.amount_off || null,
          percentOff: coupon.percent_off || null,
          currency: coupon.currency || null,
          duration: coupon.duration as StripeCouponDuration,
          durationInMonths: coupon.duration_in_months || null,
          maxRedemptions: coupon.max_redemptions || null,
          timesRedeemed: coupon.times_redeemed,
          valid: coupon.valid,
          metadata: ensureStripeMetadata(coupon.metadata),
          createdAt: new Date(coupon.created * 1000),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    delete: async (couponId: string): Promise<void> => {
      try {
        await stripeInstance.coupons.del(couponId);
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (params?: { limit?: number; startingAfter?: string }): Promise<StripeCoupon[]> => {
      const coupons = await stripeInstance.coupons.list(params);

      return coupons.data.map((coupon) => ({
        id: coupon.id,
        name: coupon.name || null,
        amountOff: coupon.amount_off || null,
        percentOff: coupon.percent_off || null,
        currency: coupon.currency || null,
        duration: coupon.duration as StripeCouponDuration,
        durationInMonths: coupon.duration_in_months || null,
        maxRedemptions: coupon.max_redemptions || null,
        timesRedeemed: coupon.times_redeemed,
        valid: coupon.valid,
        metadata: ensureStripeMetadata(coupon.metadata),
        createdAt: new Date(coupon.created * 1000),
      }));
    },
  },

  promotionCodes: {
    create: async (data: StripeCreatePromotionCodeRequest): Promise<StripePromotionCode> => {
      try {
        const promotionCode = await stripeInstance.promotionCodes.create({
          coupon: data.couponId,
          code: data.code,
          active: data.active,
          customer: data.customerId,
          expires_at: data.expiresAt ? Math.floor(data.expiresAt.getTime() / 1000) : undefined,
          max_redemptions: data.maxRedemptions,
          metadata: data.metadata,
        });

        return {
          id: promotionCode.id,
          code: promotionCode.code,
          couponId: promotionCode.coupon.id,
          active: promotionCode.active,
          customerId: typeof promotionCode.customer === 'string' ? promotionCode.customer : undefined,
          expiresAt: promotionCode.expires_at ? new Date(promotionCode.expires_at * 1000) : undefined,
          maxRedemptions: promotionCode.max_redemptions || undefined,
          timesRedeemed: promotionCode.times_redeemed,
          metadata: ensureStripeMetadata(promotionCode.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    update: async (
      promotionCodeId: string,
      data: {
        active?: boolean;
        metadata?: Record<string, any>;
      },
    ): Promise<StripePromotionCode> => {
      try {
        const promotionCode = await stripeInstance.promotionCodes.update(promotionCodeId, {
          active: data.active,
          metadata: data.metadata,
        });

        return {
          id: promotionCode.id,
          code: promotionCode.code,
          couponId: promotionCode.coupon.id,
          active: promotionCode.active,
          customerId: typeof promotionCode.customer === 'string' ? promotionCode.customer : undefined,
          expiresAt: promotionCode.expires_at ? new Date(promotionCode.expires_at * 1000) : undefined,
          maxRedemptions: promotionCode.max_redemptions || undefined,
          timesRedeemed: promotionCode.times_redeemed,
          metadata: ensureStripeMetadata(promotionCode.metadata),
        };
      } catch (error) {
        throw handleStripeError(error);
      }
    },

    list: async (params?: {
      active?: boolean;
      code?: string;
      coupon?: string;
      customer?: string;
      limit?: number;
      startingAfter?: string;
    }): Promise<StripePromotionCode[]> => {
      try {
        const promotionCodes = await stripeInstance.promotionCodes.list({
          active: params?.active,
          code: params?.code,
          coupon: params?.coupon,
          customer: params?.customer,
          limit: params?.limit,
          starting_after: params?.startingAfter,
        });

        return promotionCodes.data.map((code) => ({
          id: code.id,
          code: code.code,
          couponId: code.coupon.id,
          active: code.active,
          customerId: typeof code.customer === 'string' ? code.customer : undefined,
          expiresAt: code.expires_at ? new Date(code.expires_at * 1000) : undefined,
          maxRedemptions: code.max_redemptions || undefined,
          timesRedeemed: code.times_redeemed,
          metadata: ensureStripeMetadata(code.metadata),
        }));
      } catch (error) {
        throw handleStripeError(error);
      }
    },
  },
};

// Add helper functions for each resource type
async function syncCustomers(options: SyncOptions, result: SyncResult) {
  let hasMore = true;
  let startingAfter = options.startingAfter;

  while (hasMore) {
    const customers = await stripeInstance.customers.list({
      limit: options.limit || 100,
      starting_after: startingAfter,
      created: options.created,
    });

    for (const customer of customers.data) {
      try {
        await StripeService.webhooks.handleCustomerEvent({
          id: 'sync',
          type: WebhookEventType.CustomerCreated,
          data: { object: customer },
        } as WebhookEvent);
        result.syncedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors = [...(result.errors || []), error as Error];
      }
    }

    hasMore = customers.has_more;
    startingAfter = customers.data[customers.data.length - 1]?.id;
  }
}

async function syncSubscriptions(options: SyncOptions, result: SyncResult) {
  let hasMore = true;
  let startingAfter = options.startingAfter;

  while (hasMore) {
    const subscriptions = await stripeInstance.subscriptions.list({
      limit: options.limit || 100,
      starting_after: startingAfter,
      created: options.created,
    });

    for (const subscription of subscriptions.data) {
      try {
        await StripeService.webhooks.handleSubscriptionEvent({
          id: 'sync',
          type: WebhookEventType.SubscriptionCreated,
          data: { object: subscription },
        } as WebhookEvent);
        result.syncedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors = [...(result.errors || []), error as Error];
      }
    }

    hasMore = subscriptions.has_more;
    startingAfter = subscriptions.data[subscriptions.data.length - 1]?.id;
  }
}

async function syncProducts(options: SyncOptions, result: SyncResult) {
  let hasMore = true;
  let startingAfter = options.startingAfter;

  while (hasMore) {
    const products = await stripeInstance.products.list({
      limit: options.limit || 100,
      starting_after: startingAfter,
      created: options.created,
    });

    for (const product of products.data) {
      try {
        await StripeService.webhooks.handleProductEvent({
          id: 'sync',
          type: WebhookEventType.ProductCreated,
          data: { object: product },
        } as WebhookEvent);
        result.syncedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors = [...(result.errors || []), error as Error];
      }
    }

    hasMore = products.has_more;
    startingAfter = products.data[products.data.length - 1]?.id;
  }
}

async function syncPrices(options: SyncOptions, result: SyncResult) {
  let hasMore = true;
  let startingAfter = options.startingAfter;

  while (hasMore) {
    const prices = await stripeInstance.prices.list({
      limit: options.limit || 100,
      starting_after: startingAfter,
      created: options.created,
    });

    for (const price of prices.data) {
      try {
        await StripeService.webhooks.handlePriceEvent({
          id: 'sync',
          type: WebhookEventType.PriceCreated,
          data: { object: price },
        } as WebhookEvent);
        result.syncedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors = [...(result.errors || []), error as Error];
      }
    }

    hasMore = prices.has_more;
    startingAfter = prices.data[prices.data.length - 1]?.id;
  }
}

export default StripeService;
