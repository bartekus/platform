import { APIError, Gateway, Header } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

// ---- Config (stored as Encore secrets) ----
// Set these with `encore secret set --dev|--prod NAME`
const API_DOMAIN           = secret("API_DOMAIN");
const LOGTO_DOMAIN         = secret("LOGTO_DOMAIN");
const LOGTO_APP_ID     = secret("LOGTO_APP_ID");

// Request shape we care about
interface AuthParams {
    authorization: Header<"Authorization">;
}

// What we expose to endpoints via getAuthData()
interface AuthData {
    userID: string;
}

// Parse "Bearer xxx"
function getBearer(tokenHeader?: string): string | null {
    if (!tokenHeader) return null;
    const [scheme, token] = tokenHeader.split(" ");
    if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
    return token;
}

export const AuthHandler = authHandler<AuthParams, AuthData>(async ({ authorization }) => {
    const raw = getBearer(authorization);
    if (!raw) throw APIError.unauthenticated("Missing bearer token");

    // Build remote JWKS fetcher (jose caches keys)
    const jwks = createRemoteJWKSet(new URL(`https://${LOGTO_DOMAIN()}/oidc/jwks`));

    // Verify JWT
    const { payload } = await jwtVerify(raw, jwks, {
        issuer: `https://${LOGTO_DOMAIN()}/oidc`,
        audience: `https://${API_DOMAIN()}/api`,
        // Allow for a small clock skew (10 minutes)
        clockTolerance: 600,
    }).catch(() => {
        throw APIError.unauthenticated("Invalid token");
    });

    // Enforce client id (`client_id` or `azp`) like your Go version
    const clientId = (payload as JWTPayload & { client_id?: string; azp?: string }).client_id ?? payload.azp;
    if (clientId !== LOGTO_APP_ID()) {
        throw APIError.unauthenticated("Invalid client_id/azp");
    }

    // Subject is our user id
    const sub = payload.sub;
    if (!sub) throw APIError.unauthenticated("Token missing sub");

    return { userID: sub };
});

// Wire the gateway so auth is executed for authenticated endpoints
export const gateway = new Gateway({ authHandler: AuthHandler });