import { APIError, Gateway, Header } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import { secret } from 'encore.dev/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import log from 'encore.dev/log';
import { LRUCache } from 'lru-cache';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ---- Config (stored as Encore secrets) ----
// Set these with `encore secret set --dev|--prod NAME`
const API_DOMAIN = secret('API_DOMAIN');
const LOGTO_DOMAIN = secret('LOGTO_DOMAIN');
const LOGTO_APP_ID = secret('LOGTO_APP_ID');

// AuthParams specifies the incoming request information the auth handler is interested in.
// In this case it only cares about requests that contain the `Authorization` header.
export interface AuthParams {
  authorization: Header<'Authorization'>;
}

// The AuthData specifies the information about the authenticated user that the auth handler makes available.
export interface AuthData {
  userID: string;
  clientID: string;
  organizationID: string | undefined;
  scopes: string[];
}

// Add environment configuration validation
const getLogtoConfig = () => {
  if (!LOGTO_DOMAIN()) {
    throw APIError.internal('getLogtoConfig: LOGTO_URL environment variable is missing');
  }

  return {
    baseUrl: `https://${LOGTO_DOMAIN()}`,
    issuer: `https://${LOGTO_DOMAIN()}/oidc`,
    jwksUrl: `https://${LOGTO_DOMAIN()}/oidc/jwks`,
    apiResourceID: `https://${API_DOMAIN()}/api`,
  };
};

// Cache JWKS for better performance
const jwksCache = new LRUCache<string, ReturnType<typeof createRemoteJWKSet>>({
  max: 1, // We only need to cache one JWKS
  ttl: 1000 * 60 * 60, // 1 hour in milliseconds
  updateAgeOnGet: true, // Reset TTL when accessed
});

const extractJWT = (token: string) => {
  const bearerTokenIdentifier = 'Bearer';

  if (!token.startsWith(bearerTokenIdentifier)) {
    throw APIError.invalidArgument('extractJWT: Authorization token type not supported');
  }

  return token.slice(bearerTokenIdentifier.length + 1);
};

/*
 // Build remote JWKS fetcher (caches keys)
    const jwksUrl = `https://${LOGTO_DOMAIN()}/oidc/jwks`;
    DEV && console.log("🌐 Fetching JWKS from:", jwksUrl);
    const jwks = createRemoteJWKSet(new URL(jwksUrl));

    // Verify JWT
    try {
        const { payload } = await jwtVerify(raw, jwks, {
            issuer: `https://${LOGTO_DOMAIN()}/oidc`,
            audience: `https://${API_DOMAIN()}/api`,
            // Allow for a small clock skew (600 = 10 minutes)
            clockTolerance: 600,
        });
 */

const getJWKS = () => {
  const cacheKey = 'jwks';

  let jwks = jwksCache.get(cacheKey);

  if (!jwks) {
    const config = getLogtoConfig();

    jwks = createRemoteJWKSet(new URL(config.jwksUrl));

    jwksCache.set(cacheKey, jwks);
  }

  return jwks;
};

const decodeJwtPayload = (token: string) => {
  // Split token into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw APIError.invalidArgument('decodeJwtPayload: Invalid JWT format - token must have 3 parts');
  }

  const [, payloadBase64] = parts;

  try {
    // Add padding if needed
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;

    const payloadJson = Buffer.from(paddedBase64, 'base64').toString('utf-8');
    return JSON.parse(payloadJson);
  } catch (error) {
    if (error instanceof Error) {
      throw APIError.invalidArgument(`decodeJwtPayload: Failed to decode token payload: ${error.message}`);
    }
    throw APIError.invalidArgument('decodeJwtPayload: Failed to decode token payload');
  }
};

const verifyJwt = async (token: string | Uint8Array, audience: string) => {
  const config = getLogtoConfig();

  const JWKS = getJWKS();

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: config.issuer,
    audience,
    // Allow for a small clock skew (600 = 10 minutes)
    clockTolerance: 600,
  });

  return payload;
};

// At the user level our 'aud' should match our LOGTO_APP_API_RESOURCE
// While the `aud` (audience) claim in the JWT token follows the format:
// "urn:logto:organization:<organization_id>"
// For example: "urn:logto:organization:123456789"
// This format allows us to extract the organization ID from the token
// by removing the "urn:logto:organization:" prefix
const extractOrganizationId = (aud: any) => {
  const config = getLogtoConfig();

  console.log('extractOrganizationId:', JSON.stringify(aud));
  console.log('config.apiResourceID:', JSON.stringify(config.apiResourceID));

  if (aud === config.apiResourceID) {
    return aud;
  } else if (!aud || typeof aud !== 'string' || !aud.startsWith('urn:logto:organization:')) {
    throw APIError.unauthenticated('Invalid organization token');
  }
  return aud.replace('urn:logto:organization:', '');
};

const isJWT = (token: string): boolean => {
  // Simple check if the token contains two dots (three parts)
  return token.split('.').length === 3;
};

const getFetchOptions = (headers: Record<string, string>) => {
  const options: RequestInit = {
    headers,
  };

  return options;
};

const DEV = process.env.NODE_ENV !== 'production';

export const AuthHandler = authHandler<AuthParams, AuthData>(async ({ authorization }) => {
  DEV && console.log('🔑 Starting AuthHandler');

  if (!authorization) {
    throw APIError.unauthenticated('Authorization token missing');
  }

  log.debug('Received token', { token: authorization.substring(0, 20) + '...' });

  // Check if token type is Bearer and return the token portion
  const cleanToken = extractJWT(authorization);
  if (!cleanToken) {
    throw APIError.unauthenticated('Authorization token malformed');
  }

  // Handle both JWT and regular access tokens
  if (isJWT(cleanToken)) {
    // Handle JWT (organization) token
    const { aud } = decodeJwtPayload(cleanToken);
    if (!aud) {
      throw APIError.unauthenticated('Missing audience in token');
    }

    DEV && console.log(aud);

    const payload = await verifyJwt(cleanToken, aud);
    if (!payload.sub) {
      throw APIError.unauthenticated('Missing subject in token');
    }

    // Enforce client id (`client_id` or `azp`) like your Go version
    const clientId = (payload as JWTPayload & { client_id?: string; azp?: string }).client_id ?? payload.azp;
    if (clientId !== LOGTO_APP_ID()) {
      console.error('❌ Client ID mismatch:', clientId, '≠', LOGTO_APP_ID());
      throw APIError.unauthenticated('Invalid client_id/azp');
    }

    DEV && console.log('payload.scope', payload.scope);

    const organizationID = extractOrganizationId(payload.aud);

    return {
      userID: payload.sub,
      clientID: String(payload.client_id),
      organizationID: organizationID,
      scopes: String(payload.scope || '')
        .split(' ')
        .filter(Boolean),
    };
  } else {
    // Handle regular access token
    try {
      const config = getLogtoConfig();
      const userInfoUrl = `${config.baseUrl}/oidc/me`;

      log.debug('Fetching user info', { url: userInfoUrl });

      const response = await fetch(
        userInfoUrl,
        getFetchOptions({
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/json',
        }),
      );

      const responseText = await response.text();
      log.debug('UserInfo response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch userinfo: ${response.status} ${response.statusText}`);
      }

      let userInfo;
      try {
        userInfo = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response from userinfo endpoint: ${responseText}`);
      }

      if (!userInfo.sub) {
        throw new Error('Missing sub claim in userinfo response');
      }

      log.debug('Parsed user info', { userInfo });

      return {
        userID: userInfo.sub,
        clientID: userInfo.client_id || '',
        organizationID: '', // Empty for regular access tokens
        scopes: String(userInfo.scope || '')
          .split(' ')
          .filter(Boolean),
      };
    } catch (error) {
      log.error('Failed to verify access token', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Throw a more specific error message
      throw APIError.unauthenticated(`Failed to verify access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

export const gateway = new Gateway({ authHandler: AuthHandler });
