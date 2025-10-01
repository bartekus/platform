import { APIError } from 'encore.dev/api';
import Stripe from 'stripe';
import log from 'encore.dev/log';

export class StripeError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

export class CustomerNotFoundError extends StripeError {
  constructor(id: string) {
    super(`Customer with id ${id} not found`, 'CUSTOMER_NOT_FOUND');
  }
}

export class ProductNotFoundError extends StripeError {
  constructor(id: string) {
    super(`Product with id ${id} not found`, 'PRODUCT_NOT_FOUND');
  }
}

export class PriceNotFoundError extends StripeError {
  constructor(id: string) {
    super(`Price with id ${id} not found`, 'PRICE_NOT_FOUND');
  }
}

export class SubscriptionNotFoundError extends StripeError {
  constructor(id: string) {
    super(`Subscription with id ${id} not found`, 'SUBSCRIPTION_NOT_FOUND');
  }
}

export class InvalidWebhookSignatureError extends StripeError {
  constructor() {
    super('Invalid webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
  }
}

export class StripeCardError extends StripeError {
  constructor(message: string) {
    super(message, 'CARD_ERROR');
  }
}

export class StripeRateLimitError extends StripeError {
  constructor() {
    super('Too many requests', 'RATE_LIMIT');
  }
}

// Add more specific error types
export class StripeWebhookError extends Error {
  constructor(
    message: string,
    public readonly eventType: string,
    public readonly objectId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StripeWebhookError';
  }
}

export class StripeResourceNotFoundError extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string
  ) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = 'StripeResourceNotFoundError';
  }
}

export class StripeValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'StripeValidationError';
  }
}

// Add more specific error types
export class StripePaymentMethodError extends StripeError {
  constructor(message: string) {
    super(message, 'PAYMENT_METHOD_ERROR');
  }
}

export class StripeSubscriptionError extends StripeError {
  constructor(message: string) {
    super(message, 'SUBSCRIPTION_ERROR');
  }
}

export class StripeSyncError extends StripeError {
  constructor(message: string, public resource: string) {
    super(message, 'SYNC_ERROR');
  }
}

// Update error handler
export const handleStripeError = (error: unknown): never => {
  if (error instanceof Stripe.errors.StripeError) {
    log.error('Stripe API error:', {
      type: error.type,
      code: error.code,
      message: error.message,
      requestId: error.requestId,
    });

    switch (error.type) {
      case 'StripeCardError':
        throw APIError.invalidArgument(error.message);
      case 'StripeInvalidRequestError':
        throw APIError.invalidArgument(error.message);
      case 'StripeAuthenticationError':
        throw APIError.unauthenticated(error.message);
      case 'StripeAPIError':
        throw APIError.internal(error.message);
      case 'StripeConnectionError':
        throw APIError.unavailable(error.message);
      case 'StripeRateLimitError':
        throw APIError.resourceExhausted(error.message);
      default:
        throw APIError.internal('An unexpected error occurred');
    }
  }

  log.error('Unknown error in Stripe integration:', error);
  throw APIError.internal('An unexpected error occurred');
};
