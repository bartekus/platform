import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import {
  SyncableResource,
  SyncOptions,
  WebhookEvent,
  WebhookEventType,
  StripeResponse,
  StripeCustomer,
  StripeProduct,
  StripeRefund,
  StripeSubscriptionSchedule,
  RefundReason,
  CreateCustomerRequest,
  CreateProductRequest,
  CreatePriceRequest,
  ListProductsRequest,
  ListPricesRequest,
  CreateBillingPortalSessionRequest,
  CreateCheckoutSessionRequest,
  UpdateSubscriptionRequest,
  CreateSetupIntentRequest,
  CreateTaxIdRequest,
  CreateSubscriptionScheduleRequest,
  CreateSubscriptionItemRequest,
  UpdateSubscriptionItemRequest,
  CreateRefundRequest,
  CreateUsageRecordRequest,
  ListUsageRecordsRequest,
  StripePrice,
  StripeBillingPortalSession,
  StripeCheckoutSession,
  StripeSetupIntent,
  StripeTaxId,
  StripeSubscriptionItem,
  ListRefundsRequest,
  UpdateRefundRequest,
  ListPromotionCodesRequest,
  UpdatePromotionCodeRequest,
  ListCouponsRequest,
  SyncStripeDataRequest,
  StripeSubscription,
  SyncResult,
  StripeCoupon,
  StripePromotionCode,
  GetSubscriptionUrlRequest,
  GetSubscriptionUrl,
} from "./stripe.interface";
import StripeService from "./stripe.service";
import { stripe } from "./stripe.config";
import { InvalidWebhookSignatureError } from "./stripe.errors";
import { STRIPE_WEBHOOK_SECRET } from "./stripe.config";
import type { IncomingMessage, ServerResponse } from "http";
import { handleStripeError } from "./stripe.errors";
import { stripeLogger } from "./monitoring.service";
import { monitorStripeOperation } from "./monitoring.service";
import { logto } from "~encore/clients";
import { LogtoAPIResponse } from "../api/logto/types";
import { secret } from "encore.dev/config";

// Secret declarations
const LOGTO_DOMAIN = secret("LOGTO_DOMAIN");
const LOGTO_MANAGEMENT_API_APPLICATION_ID = secret("LOGTO_MANAGEMENT_API_APPLICATION_ID");
const LOGTO_MANAGEMENT_API_APPLICATION_SECRET = secret("LOGTO_MANAGEMENT_API_APPLICATION_SECRET");

interface LogtoWebhookEvent {
  event: string;
  user: {
    id: string;
    primaryEmail: string;
    name: string;
    // ... other user fields
  };
  application: {
    id: string;
    name: string;
    type: string;
    description: string;
  };
  userId: string;
  userIp: string;
  createdAt: string;
  sessionId: string;
  userAgent: string;
  interactionEvent: string;
  hookId: string;
}

// Webhook handler
export const webhook = api.raw(
  {
    method: "POST",
    path: "/stripe/webhooks",
    bodyLimit: null, // Allow unlimited body size for webhook payloads
  },
  async (req: IncomingMessage, resp: ServerResponse) => {
    return monitorStripeOperation("webhook_handler", async () => {
      try {
        const signature = req.headers["stripe-signature"];
        if (!signature) {
          throw APIError.invalidArgument("Missing stripe signature");
        }

        let event: WebhookEvent;

        try {
          // Get raw body from request
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString("utf8");

          event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET()) as WebhookEvent;
        } catch (err) {
          stripeLogger.error("Webhook signature verification failed:", err);
          throw new InvalidWebhookSignatureError();
        }

        try {
          // Handle webhook events
          switch (event.type) {
            case WebhookEventType.CustomerCreated:
            case WebhookEventType.CustomerUpdated:
              await StripeService.webhooks.handleCustomerEvent(event);
              break;
            case WebhookEventType.SubscriptionCreated:
            case WebhookEventType.SubscriptionUpdated:
              await StripeService.webhooks.handleSubscriptionEvent(event);
              break;
            case WebhookEventType.PriceCreated:
            case WebhookEventType.PriceUpdated:
            case WebhookEventType.PriceDeleted:
              await StripeService.webhooks.handlePriceEvent(event);
              break;
            case WebhookEventType.ProductCreated:
            case WebhookEventType.ProductUpdated:
            case WebhookEventType.ProductDeleted:
              await StripeService.webhooks.handleProductEvent(event);
              break;
            case WebhookEventType.PaymentSucceeded:
            case WebhookEventType.PaymentFailed:
              await StripeService.webhooks.handlePaymentEvent(event);
              break;
            case WebhookEventType.InvoicePaid:
            case WebhookEventType.InvoicePaymentFailed:
              await StripeService.webhooks.handleInvoiceEvent(event);
              break;
            case WebhookEventType.CouponCreated:
            case WebhookEventType.CouponUpdated:
            case WebhookEventType.CouponDeleted:
              await StripeService.webhooks.handleCouponEvent(event);
              break;
            case WebhookEventType.PromotionCodeCreated:
            case WebhookEventType.PromotionCodeUpdated:
              await StripeService.webhooks.handlePromotionCodeEvent(event);
              break;
            default:
              stripeLogger.info(`Unhandled event type: ${event.type}`);
          }

          // Send response
          resp.setHeader("Content-Type", "application/json");
          resp.end(JSON.stringify({ success: true }));
        } catch (err) {
          stripeLogger.error("Error processing webhook:", err);
          stripeLogger.info(`webhook type: ${event.type}`);
          throw APIError.internal("Failed to process webhook");
        }
      } catch (err) {
        if (err instanceof APIError) {
          resp.statusCode = Number(err.code);
          resp.end(
            JSON.stringify({
              success: false,
              error: err.message,
            })
          );
          return;
        }

        stripeLogger.error("Webhook handler error:", err);
        resp.statusCode = 500;
        resp.end(
          JSON.stringify({
            success: false,
            error: "Internal server error",
          })
        );
      }
    });
  }
);

export const checkLogtoWebhook = api(
  { method: "GET", path: "/stripe/logto/webhooks", expose: true }, // ensure reachable on gateway
  async () => ({ ok: true }) // returns 200
);

// Logto webhook handler
export const logtoWebhook = api.raw(
  {
    method: "POST",
    path: "/stripe/logto/webhook",
    bodyLimit: null, // Allow unlimited body size for webhook payloads
    expose: true,
  },
  async (req: IncomingMessage, resp: ServerResponse) => {
    console.log(req);

    try {
      stripeLogger.info("Starting Logto webhook handler");

      // Read request body
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString("utf8");

      stripeLogger.info("Received webhook body:", { rawBody });

      // Parse JSON body
      const webhookData = JSON.parse(rawBody);
      const { event, user, userId } = webhookData;

      stripeLogger.info("Processing Logto webhook:", {
        event,
        userId,
        email: user?.primaryEmail,
        hookId: webhookData.hookId,
        userAgent: webhookData.userAgent,
      });

      // Handle user creation event
      if (event === "PostRegister") {
        const email = user?.primaryEmail;

        if (!email) {
          stripeLogger.error("LogtoToStripe", "Missing email in webhook data");
          throw APIError.invalidArgument("Email is required for Stripe customer creation");
        }

        if (!userId) {
          stripeLogger.error("LogtoToStripe", "Missing userId in webhook data");
          throw APIError.invalidArgument("userId is required for Stripe customer creation");
        }

        stripeLogger.info("Creating Stripe customer:", {
          email,
          accountId: userId,
        });

        // Create Stripe customer
        const customer = await StripeService.customers.create({
          email,
          accountId: userId,
        });

        stripeLogger.info("Created Stripe customer, updating Logto user:", {
          stripeCustomerId: customer.id,
        });

        // Get management API token
        const accessToken = await logto.getManagementApiToken();
        const logtoUrl = `https://${LOGTO_DOMAIN()}`;

        stripeLogger.info("Got management API token, updating Logto user:", {
          url: `${logtoUrl}/api/users/${userId}`,
          hasToken: !!accessToken,
        });

        // Update Logto user's custom data using Management API
        const response = await fetch(`${logtoUrl}/api/users/${userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken.token}`, // Use accessToken.token instead of the whole object
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customData: {
              stripeCustomerId: customer.id,
              subscription: null,
            },
          }),
        });

        const responseText = await response.text();
        stripeLogger.info("Logto API response:", {
          status: response.status,
          ok: response.ok,
          headers: response.headers,
          response: responseText,
          sentToken: `Bearer ${accessToken.token}`, // Log the actual token string
        });

        if (!response.ok) {
          stripeLogger.error("Failed to update Logto user custom data:", {
            status: response.status,
            response: responseText,
            headers: Object.fromEntries(response.headers),
          });
          throw new Error(`Failed to update Logto user custom data: ${responseText}`);
        }

        stripeLogger.info("Successfully created Stripe customer and updated Logto user:", {
          userId,
          email,
          stripeCustomerId: customer.id,
        });
      } else {
        stripeLogger.info("Ignoring non-PostRegister event:", { event });
      }

      resp.statusCode = 200;
      resp.setHeader("Content-Type", "application/json");
      resp.end(JSON.stringify({ success: true }));
    } catch (err) {
      stripeLogger.error("Error processing Logto webhook:", err);

      if (err instanceof APIError) {
        resp.statusCode = Number(err.code);
        resp.end(
          JSON.stringify({
            success: false,
            error: err.message,
          })
        );
        return;
      }

      resp.statusCode = 500;
      resp.end(
        JSON.stringify({
          success: false,
          error: "Internal server error",
        })
      );
    }
  }
);

/*
    return monitorStripeOperation('logto_webhook_handler', async () => {

    });
  },
);
*/
// Customer creation endpoint
export const createCustomer = api(
  {
    method: "POST",
    path: "/stripe/customers",
    auth: true,
  },
  async (params: CreateCustomerRequest): Promise<StripeResponse<StripeCustomer>> => {
    try {
      const customer = await StripeService.customers.create(params);
      return { success: true, result: customer };
    } catch (error) {
      stripeLogger.error("Failed to create customer", error);
      throw handleStripeError(error);
    }
  }
);

// Product creation endpoint
export const createProduct = api(
  {
    method: "POST",
    path: "/stripe/products",
    auth: true,
  },
  async (params: CreateProductRequest): Promise<StripeResponse<StripeProduct>> => {
    try {
      const product = await StripeService.products.create(params);
      return { success: true, result: product };
    } catch (error) {
      stripeLogger.error("Failed to create product", error);
      throw handleStripeError(error);
    }
  }
);

// Price creation endpoint
export const createPrice = api(
  {
    method: "POST",
    path: "/stripe/prices",
    auth: true,
  },
  async (params: CreatePriceRequest) => {
    try {
      const price = await StripeService.prices.create(params);
      return { success: true, result: price };
    } catch (error) {
      stripeLogger.error("Failed to create price:", error);
      throw handleStripeError(error);
    }
  }
);

// List products endpoint
export const listProducts = api(
  {
    method: "GET",
    path: "/stripe/products",
    auth: true,
  },
  async (params: ListProductsRequest): Promise<StripeResponse<StripeProduct[]>> => {
    try {
      const products = await StripeService.products.list(params);
      return {
        success: true,
        result: products,
        hasMore: products.length === params.limit,
        nextPageToken: products[products.length - 1]?.id,
      };
    } catch (error) {
      stripeLogger.error("Failed to list products:", error);
      throw handleStripeError(error);
    }
  }
);

// List prices endpoint
export const listPrices = api(
  {
    method: "GET",
    path: "/stripe/prices",
    auth: true,
  },
  async (params: ListPricesRequest): Promise<StripeResponse<StripePrice[]>> => {
    try {
      const prices = await StripeService.prices.list(params);
      return { success: true, result: prices };
    } catch (error) {
      stripeLogger.error("Failed to list prices:", error);
      throw handleStripeError(error);
    }
  }
);

// Update billing portal endpoint
export const createBillingPortalSession = api(
  {
    method: "POST",
    path: "/stripe/billing-portal",
    auth: true,
  },
  async (params: CreateBillingPortalSessionRequest): Promise<StripeResponse<StripeBillingPortalSession>> => {
    try {
      const session = await StripeService.billingPortal.createSession(params);
      return { success: true, result: session };
    } catch (error) {
      stripeLogger.error("Failed to create billing portal session:", error);
      throw handleStripeError(error);
    }
  }
);

// Update checkout session endpoint
export const createCheckoutSession = api(
  {
    method: "POST",
    path: "/stripe/checkout",
    auth: true,
  },
  async (params: CreateCheckoutSessionRequest): Promise<StripeResponse<StripeCheckoutSession>> => {
    try {
      const session = await StripeService.checkout.create(params);
      return { success: true, result: session };
    } catch (error) {
      stripeLogger.error("Failed to create checkout session:", error);
      throw handleStripeError(error);
    }
  }
);

// Update subscription update endpoint
export const updateSubscription = api(
  {
    method: "PATCH",
    path: "/stripe/subscriptions/:id",
    auth: true,
  },
  async (params: UpdateSubscriptionRequest): Promise<StripeResponse<StripeSubscription>> => {
    try {
      const { id, ...updateData } = params;
      const subscription = await StripeService.subscriptions.update(id, updateData);
      return { success: true, result: subscription };
    } catch (error) {
      stripeLogger.error("Failed to update subscription:", error);
      throw handleStripeError(error);
    }
  }
);

// Update sync endpoint
export const syncStripeData = api(
  {
    method: "POST",
    path: "/stripe/sync",
    auth: true,
  },
  async (params: SyncStripeDataRequest): Promise<StripeResponse<SyncResult[]>> => {
    try {
      const resultsRecord = await StripeService.sync.backfill(params);
      // Convert the record to an array
      const results = Object.entries(resultsRecord).map(([resource, result]) => ({
        ...result,
        resource: resource as SyncableResource,
      }));
      return { success: true, result: results };
    } catch (error) {
      stripeLogger.error("Failed to sync Stripe data:", error);
      throw handleStripeError(error);
    }
  }
);

// Update setup intent endpoint
export const createSetupIntent = api(
  {
    method: "POST",
    path: "/stripe/setup-intents",
    auth: true,
  },
  async (params: CreateSetupIntentRequest): Promise<StripeResponse<StripeSetupIntent>> => {
    try {
      const setupIntent = await StripeService.setupIntents.create(params);
      return { success: true, result: setupIntent };
    } catch (error) {
      stripeLogger.error("Failed to create setup intent:", error);
      throw handleStripeError(error);
    }
  }
);

// Update tax ID endpoints
export const createTaxId = api(
  {
    method: "POST",
    path: "/stripe/customers/:customerId/tax-ids",
    auth: true,
  },
  async (params: CreateTaxIdRequest): Promise<StripeResponse<StripeTaxId>> => {
    try {
      const taxId = await StripeService.taxIds.create(params);
      return { success: true, result: taxId };
    } catch (error) {
      stripeLogger.error("Failed to create tax ID:", error);
      throw handleStripeError(error);
    }
  }
);

export const listTaxIds = api(
  {
    method: "GET",
    path: "/stripe/customers/:customerId/tax-ids",
    auth: true,
  },
  async (params: { customerId: string }) => {
    try {
      const taxIds = await StripeService.taxIds.list(params.customerId);
      return { success: true, result: taxIds };
    } catch (error) {
      stripeLogger.error("Failed to list tax IDs:", error);
      throw handleStripeError(error);
    }
  }
);

export const deleteTaxId = api(
  {
    method: "DELETE",
    path: "/stripe/customers/:customerId/tax-ids/:taxIdId",
    auth: true,
  },
  async (params: { customerId: string; taxIdId: string }) => {
    try {
      await StripeService.taxIds.delete(params.customerId, params.taxIdId);
      return { success: true };
    } catch (error) {
      stripeLogger.error("Failed to delete tax ID:", error);
      throw handleStripeError(error);
    }
  }
);

// Add subscription schedule endpoints
export const createSubscriptionSchedule = api(
  {
    method: "POST",
    path: "/stripe/subscription-schedules",
    auth: true,
  },
  async (params: {
    customerId: string;
    startDate?: number;
    phases: Array<{
      startDate: number;
      endDate?: number;
      items: Array<{ price: string; quantity?: number }>;
      metadata?: Record<string, any>;
    }>;
    metadata?: Record<string, any>;
  }): Promise<StripeResponse<StripeSubscriptionSchedule>> => {
    try {
      const convertedParams = {
        customerId: params.customerId,
        phases: params.phases.map((phase) => ({
          startDate: new Date(phase.startDate * 1000),
          endDate: phase.endDate ? new Date(phase.endDate * 1000) : undefined,
          items: phase.items,
        })),
        metadata: params.metadata,
      };
      const schedule = await StripeService.subscriptionSchedules.create(convertedParams);
      return { success: true, result: schedule };
    } catch (error) {
      stripeLogger.error("Failed to create subscription schedule:", error);
      throw handleStripeError(error);
    }
  }
);

export const cancelSubscriptionSchedule = api(
  {
    method: "POST",
    path: "/stripe/subscription-schedules/:id/cancel",
    auth: true,
  },
  async (params: { id: string }) => {
    try {
      const schedule = await StripeService.subscriptionSchedules.cancel(params.id);
      return { success: true, result: schedule };
    } catch (error) {
      stripeLogger.error("Failed to cancel subscription schedule:", error);
      throw handleStripeError(error);
    }
  }
);

export const releaseSubscriptionSchedule = api(
  {
    method: "POST",
    path: "/stripe/subscription-schedules/:id/release",
    auth: true,
  },
  async (params: { id: string }) => {
    try {
      const schedule = await StripeService.subscriptionSchedules.release(params.id);
      return { success: true, result: schedule };
    } catch (error) {
      stripeLogger.error("Failed to release subscription schedule:", error);
      throw handleStripeError(error);
    }
  }
);

// Update subscription item endpoints
export const createSubscriptionItem = api(
  {
    method: "POST",
    path: "/stripe/subscriptions/:subscriptionId/items",
    auth: true,
  },
  async (params: CreateSubscriptionItemRequest): Promise<StripeResponse<StripeSubscriptionItem>> => {
    try {
      const item = await StripeService.subscriptionItems.create(params);
      return { success: true, result: item };
    } catch (error) {
      stripeLogger.error("Failed to create subscription item:", error);
      throw handleStripeError(error);
    }
  }
);

export const updateSubscriptionItem = api(
  {
    method: "PATCH",
    path: "/stripe/subscription-items/:id",
    auth: true,
  },
  async (params: UpdateSubscriptionItemRequest): Promise<StripeResponse<StripeSubscriptionItem>> => {
    try {
      const { id, ...updateData } = params;
      const item = await StripeService.subscriptionItems.update(id, updateData);
      return { success: true, result: item };
    } catch (error) {
      stripeLogger.error("Failed to update subscription item:", error);
      throw handleStripeError(error);
    }
  }
);

export const deleteSubscriptionItem = api(
  {
    method: "DELETE",
    path: "/stripe/subscription-items/:id",
    auth: true,
  },
  async (params: { id: string }) => {
    try {
      await StripeService.subscriptionItems.delete(params.id);
      return { success: true };
    } catch (error) {
      stripeLogger.error("Failed to delete subscription item:", error);
      throw handleStripeError(error);
    }
  }
);

export const listSubscriptionItems = api(
  {
    method: "GET",
    path: "/stripe/subscriptions/:subscriptionId/items",
    auth: true,
  },
  async (params: { subscriptionId: string }) => {
    try {
      const items = await StripeService.subscriptionItems.list(params.subscriptionId);
      return { success: true, result: items };
    } catch (error) {
      stripeLogger.error("Failed to list subscription items:", error);
      throw handleStripeError(error);
    }
  }
);

// Update refund endpoints
export const createRefund = api(
  {
    method: "POST",
    path: "/stripe/refunds",
    auth: true,
  },
  async (params: {
    paymentIntent: string;
    amount?: number;
    reason?: RefundReason;
    metadata?: Record<string, any>;
  }): Promise<StripeResponse<StripeRefund>> => {
    try {
      const refund = await StripeService.refunds.create(params);
      return { success: true, result: refund };
    } catch (error) {
      stripeLogger.error("Failed to create refund:", error);
      throw handleStripeError(error);
    }
  }
);

export const getRefund = api(
  {
    method: "GET",
    path: "/stripe/refunds/:id",
    auth: true,
  },
  async (params: { id: string }) => {
    try {
      const refund = await StripeService.refunds.retrieve(params.id);
      return { success: true, result: refund };
    } catch (error) {
      stripeLogger.error("Failed to retrieve refund:", error);
      throw handleStripeError(error);
    }
  }
);

export const updateRefund = api(
  {
    method: "PATCH",
    path: "/stripe/refunds/:id",
    auth: true,
  },
  async (params: UpdateRefundRequest): Promise<StripeResponse<StripeRefund>> => {
    try {
      const { id, ...updateData } = params;
      const refund = await StripeService.refunds.update(id, updateData);
      return { success: true, result: refund };
    } catch (error) {
      stripeLogger.error("Failed to update refund:", error);
      throw handleStripeError(error);
    }
  }
);

export const listRefunds = api(
  {
    method: "GET",
    path: "/stripe/refunds",
    auth: true,
  },
  async (params: ListRefundsRequest): Promise<StripeResponse<StripeRefund[]>> => {
    try {
      const refunds = await StripeService.refunds.list(params);
      return { success: true, result: refunds };
    } catch (error) {
      stripeLogger.error("Failed to list refunds:", error);
      throw handleStripeError(error);
    }
  }
);

// Add usage record endpoints
export const createUsageRecord = api(
  {
    method: "POST",
    path: "/stripe/subscription-items/:subscriptionItemId/usage",
    auth: true,
  },
  async (params: {
    subscriptionItemId: string;
    quantity: number;
    timestamp?: number;
    action?: "increment" | "set";
    metadata?: Record<string, any>;
  }) => {
    try {
      const usageRecord = await StripeService.usageRecords.create(params);
      return { success: true, result: usageRecord };
    } catch (error) {
      stripeLogger.error("Failed to create usage record:", error);
      throw handleStripeError(error);
    }
  }
);

export const listUsageRecords = api(
  {
    method: "GET",
    path: "/stripe/subscription-items/:subscriptionItemId/usage",
    auth: true,
  },
  async (params: { subscriptionItemId: string; limit?: number; startingAfter?: string }) => {
    try {
      const { subscriptionItemId, ...listParams } = params;
      const usageRecords = await StripeService.usageRecords.list(subscriptionItemId, listParams);
      return { success: true, result: usageRecords };
    } catch (error) {
      stripeLogger.error("Failed to list usage records:", error);
      throw handleStripeError(error);
    }
  }
);

// Update coupon endpoints
export const listCoupons = api(
  {
    method: "GET",
    path: "/stripe/coupons",
    auth: true,
  },
  async (params: ListCouponsRequest): Promise<StripeResponse<StripeCoupon[]>> => {
    try {
      const coupons = await StripeService.coupons.list(params);
      return { success: true, result: coupons };
    } catch (error) {
      stripeLogger.error("Failed to list coupons:", error);
      throw handleStripeError(error);
    }
  }
);

// Update promotion code endpoints
export const listPromotionCodes = api(
  {
    method: "GET",
    path: "/stripe/promotion-codes",
    auth: true,
  },
  async (params: ListPromotionCodesRequest): Promise<StripeResponse<StripePromotionCode[]>> => {
    try {
      const promotionCodes = await StripeService.promotionCodes.list(params);
      return { success: true, result: promotionCodes };
    } catch (error) {
      stripeLogger.error("Failed to list promotion codes:", error);
      throw handleStripeError(error);
    }
  }
);

// List plans endpoint
export const listPlans = api(
  {
    method: "GET",
    path: "/stripe/plans",
    auth: true,
    expose: true,
  },
  async (params: ListProductsRequest): Promise<StripeResponse<StripeProduct[]>> => {
    try {
      const products = await listProducts(params);
      const prices = await listPrices(params);

      if (!products.result || !prices.result) {
        throw APIError.internal("Failed to list products or prices");
      }

      if (products.result.length === 0) {
        return {
          success: true,
          result: [],
        };
      }
      const plans = products.result.map((product) => {
        // prices.result is guaranteed to be defined due to the check above
        const planPricing = prices
          .result!.filter((price) => price.productId === product.id)
          // This will sort the prices from lowest to highest amount.
          // Sort by unitAmount ascending with return fallback of '|| 0' to handles cases where unitAmount might be null or undefined.
          .sort((a, b) => (a.unitAmount || 0) - (b.unitAmount || 0));

        return {
          ...product,
          planPricing,
        };
      });

      return {
        success: true,
        result: plans,
        hasMore: plans.length === params.limit,
        nextPageToken: plans[plans.length - 1]?.id,
      };
    } catch (error) {
      stripeLogger.error("Failed to list products:", error);
      throw handleStripeError(error);
    }
  }
);

export const getSubscriptionUrl = api(
  {
    method: "POST",
    path: "/stripe/subscription-url",
    auth: true,
    expose: true,
  },
  async (params: GetSubscriptionUrlRequest): Promise<StripeResponse<GetSubscriptionUrl>> => {
    try {
      const session = await StripeService.checkout.create({
        priceId: params.priceId,
        customerId: params.customerId,
        mode: "subscription",
        quantity: 1,
      });

      if (!session.url) {
        throw new Error("Failed to generate subscription URL");
      }

      return {
        success: true,
        result: { url: session.url },
      };
    } catch (error) {
      stripeLogger.error("Failed to generate subscription URL:", error);
      throw handleStripeError(error);
    }
  }
);
