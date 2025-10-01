import log from 'encore.dev/log';
import { Counter, Histogram } from 'prom-client';
import { Stripe } from 'stripe';
import { handleStripeError } from './stripe.errors';

// Initialize Prometheus metrics
export const stripeMetrics = {
  webhookLatency: new Histogram({
    name: 'stripe_webhook_latency',
    help: 'Latency of Stripe webhook processing in milliseconds',
    buckets: [10, 50, 100, 200, 500, 1000, 2000],
  }),

  webhookErrors: new Counter({
    name: 'stripe_webhook_errors',
    help: 'Number of Stripe webhook processing errors',
    labelNames: ['event_type', 'error_type'],
  }),

  apiLatency: new Histogram({
    name: 'stripe_api_latency',
    help: 'Latency of Stripe API calls in milliseconds',
    labelNames: ['operation'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000],
  }),

  apiErrors: new Counter({
    name: 'stripe_api_errors',
    help: 'Number of Stripe API errors',
    labelNames: ['operation', 'error_type'],
  }),

  syncOperations: new Counter({
    name: 'stripe_sync_operations',
    help: 'Number of Stripe sync operations',
    labelNames: ['resource', 'status'],
  }),

  activeSubscriptions: new Counter({
    name: 'stripe_active_subscriptions',
    help: 'Number of active Stripe subscriptions',
  }),

  paymentMethodAttachments: new Counter({
    name: 'stripe_payment_method_attachments',
    help: 'Number of payment method attachments',
    labelNames: ['status'],
  }),
};

// Structured logging
export const stripeLogger = {
  info: (message: string, data?: Record<string, unknown>) => {
    log.info(message, { service: 'stripe', ...data });
  },

  error: (message: string, error: unknown, data?: Record<string, unknown>) => {
    log.error(message, {
      service: 'stripe',
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      ...data,
    });
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    log.warn(message, { service: 'stripe', ...data });
  },

  debug: (message: string, data?: Record<string, unknown>) => {
    log.debug(message, { service: 'stripe', ...data });
  },
};

// Add a new utility function to standardize monitoring
export const monitorStripeOperation = async <T>(
  operation: string,
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => never,
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await fn();
    stripeMetrics.apiLatency.observe({ operation }, Date.now() - startTime);
    return result;
  } catch (error) {
    stripeMetrics.apiErrors.inc({
      operation,
      error_type: error instanceof Error ? error.name : 'unknown',
    });
    stripeLogger.error(`Failed ${operation}`, error);

    // Add error boundary handling
    if (error instanceof Stripe.errors.StripeError) {
      if (errorHandler) {
        errorHandler(error);
      }
      throw handleStripeError(error);
    }

    throw error;
  }
};
