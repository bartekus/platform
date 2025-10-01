import { api } from 'encore.dev/api';
import { secret } from 'encore.dev/config';
import { APIError, ErrCode } from 'encore.dev/api';
import log from 'encore.dev/log';
import { LRUCache } from 'lru-cache';

import { TokenResponse, TokenCache, LogtoAPIOptions, TokenResult, LogtoAPIResponse } from './types';

// Secret configuration
const LOGTO_DOMAIN = secret('LOGTO_DOMAIN');
const LOGTO_MANAGEMENT_API_APPLICATION_ID = secret('LOGTO_MANAGEMENT_API_APPLICATION_ID');
const LOGTO_MANAGEMENT_API_APPLICATION_SECRET = secret('LOGTO_MANAGEMENT_API_APPLICATION_SECRET');

// Cache JWKS for better performance
const tokenCache = new LRUCache<string, TokenCache>({
  max: 1, // We only need to cache one api management token
  ttl: 1000 * 60 * 5, // 5 min in milliseconds
  updateAgeOnGet: true, // Reset TTL when accessed
});

function isJson(item: any): boolean {
  if (typeof item !== 'string') {
    return false;
  }
  try {
    const value = JSON.parse(item);
    return value !== null && (typeof value === 'object' || Array.isArray(value));
  } catch (e) {
    return false;
  }
}

function testIsJson(value: any, expected: any) {
  log.info(`Expected: ${expected}, Actual: ${isJson(value)}`);
}

// Internal endpoint to get management API token
export const getManagementApiToken = api({}, async (): Promise<TokenResult> => {
  const cacheKey = 'management_token';
  const cachedToken = tokenCache.get(cacheKey);

  // Return cached token if it exists and not expiring within 5 minutes
  if (cachedToken && Date.now() < cachedToken.expiresAt - 6 * 60 * 1000) {
    log.debug('Using cached token', { expiresIn: Math.floor((cachedToken.expiresAt - Date.now()) / 1000) });

    return { token: cachedToken.token };
  }

  const credentials = Buffer.from(`${LOGTO_MANAGEMENT_API_APPLICATION_ID()}:${LOGTO_MANAGEMENT_API_APPLICATION_SECRET()}`).toString(
    'base64',
  );

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      resource: "https://default.logto.app/api",
      scope: 'all',
    });

    log.debug('Token request params', {
      params: params.toString(),
      url: `https://${LOGTO_DOMAIN()}/oidc/token`,
    });

    const response = await fetch(`https://${LOGTO_DOMAIN()}/oidc/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      log.error('Token request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      throw new APIError(
        response.status === 401 ? ErrCode.Unauthenticated : ErrCode.Internal,
        `Failed to fetch management API token: ${response.status} ${response.statusText}`,
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    log.debug('Received token response', {
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
    });

    const newToken = {
      token: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    tokenCache.set(cacheKey, newToken);

    return { token: newToken.token };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    log.error(error, 'Failed to fetch Logto management API token', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw APIError.internal('Failed to fetch management API token');
  }
});

// Generic Logto API call endpoint
export const callApi = api<LogtoAPIOptions, LogtoAPIResponse<any>>(
  { auth: true, expose: true },
  async (options): Promise<LogtoAPIResponse<any>> => {
    try {
      log.info('Making Logto API call', {
        path: options.path,
        method: options.method,
      });

      const { token } = await getManagementApiToken();
      const response = await fetch(new URL(`https://${LOGTO_DOMAIN()}${options.path}`), {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
        body: options.body,
      });

      if (!response.ok) {
        const errorText = await response.text();

        log.error('Logto API call failed', {
          status: response.status,
          statusText: response.statusText,
          path: options.path,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        throw new APIError(
          response.status === 401 ? ErrCode.Unauthenticated : ErrCode.Internal,
          `Logto API error: ${response.statusText}`,
        );
      }

      const responseText = await response.text();

      // Handle empty or "Created" responses
      if (!responseText || responseText === 'Created') {
        log.debug(`callLogtoApi ${options.method} ${options.path} raw response 1`, { responseText });
        return { data: responseText } as LogtoAPIResponse<unknown>;
      }

      if (options.path === '/api/organization-roles') {
        return { data: responseText } as LogtoAPIResponse<unknown>;
      }

      // Parse JSON response
      if (isJson(responseText)) {
        const parsed = JSON.parse(responseText);
        log.debug(`callLogtoApi ${options.method} ${options.path} parsed response`, parsed);
        return { data: parsed } as LogtoAPIResponse<any>;
      }

      log.debug(`callLogtoApi ${options.method} ${options.path} raw response 2`, { responseText });

      // Return non-JSON response as data field
      return { data: responseText } as LogtoAPIResponse<any>;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error(error, `Failed to call Logto API: ${options.path}`, {
        error: error instanceof Error ? error.message : String(error),
        path: options.path,
      });
      throw APIError.internal(`Failed to call Logto API URL: ${options.path}`);
    }
  },
);
