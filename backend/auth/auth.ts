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
    console.log("🔑 Starting AuthHandler");

    const raw = getBearer(authorization);
    if (!raw) {
        console.error("❌ Missing or malformed Authorization header");
        throw APIError.unauthenticated("Missing bearer token");
    }
    console.log("📦 Got bearer token, length:", raw.length);

    // Build remote JWKS fetcher (caches keys)
    const jwksUrl = `https://${LOGTO_DOMAIN()}/oidc/jwks`;
    console.log("🌐 Fetching JWKS from:", jwksUrl);
    const jwks = createRemoteJWKSet(new URL(jwksUrl));

    // Verify JWT
    try {
        const { payload } = await jwtVerify(raw, jwks, {
            issuer: `https://${LOGTO_DOMAIN()}/oidc`,
            audience: `https://${API_DOMAIN()}/api`,
            // Allow for a small clock skew (600 = 10 minutes)
            clockTolerance: 600,
        });

        console.log("✅ Token verified");
        console.log("   iss:", payload.iss);
        console.log("   aud:", payload.aud);
        console.log("   sub:", payload.sub);
        console.log("   client_id:", (payload as any).client_id);
        console.log("   azp:", (payload as any).azp);

        // Enforce client id (`client_id` or `azp`) like your Go version
        const clientId = (payload as JWTPayload & { client_id?: string; azp?: string }).client_id ?? payload.azp;
        if (clientId !== LOGTO_APP_ID()) {
            console.error("❌ Client ID mismatch:", clientId, "≠", LOGTO_APP_ID());
            throw APIError.unauthenticated("Invalid client_id/azp");
        }

        if (!payload.sub) {
            console.error("❌ Token missing sub");
            throw APIError.unauthenticated("Token missing subject");
        }

        console.log("🎉 Auth success for user:", payload.sub);
        return { userID: payload.sub };

    } catch (err) {
        console.error("❌ Token verification failed:", err);
        throw APIError.unauthenticated("Invalid token");
    }
});

export const gateway = new Gateway({ authHandler: AuthHandler });