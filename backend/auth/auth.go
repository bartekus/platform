package auth

import (
	"context"
	"fmt"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/config"
	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

// Configuration variables for authentication
type LogtoAuthConfig struct {
	// The issuer URL
	Issuer config.String
	// URL to fetch JSON Web Key Set (JWKS)
	JwksUri config.String
	// Expected audience for the JWT
	ApiResourceIndicator config.String
	// Expected client ID in the token claims
	ClientId config.String
}

var authConfig *LogtoAuthConfig = config.Load[*LogtoAuthConfig]()

// RequiredClaims defines the expected structure of JWT claims
// Extends the standard JWT claims with a custom ClientID field
type RequiredClaims struct {
    ClientID string `json:"client_id,omitempty"`
    AZP      string `json:"azp,omitempty"`
	jwt.RegisteredClaims
}

//encore:authhandler
func AuthHandler(ctx context.Context, token string) (auth.UID, error) {
    fmt.Println("🔑 Starting AuthHandler")
//     fmt.Printf("Expected Issuer: %s\n", authConfig.Issuer())
//     fmt.Printf("Expected Audience: %s\n", authConfig.ApiResourceIndicator())
//     fmt.Printf("Expected ClientID: %s\n", authConfig.ClientId())
//     fmt.Printf("JWKS URI: %s\n", authConfig.JwksUri())

	// Fetch and parse the JWKS (JSON Web Key Set) from the identity provider
	jwks, err := keyfunc.NewDefaultCtx(ctx, []string{authConfig.JwksUri()})
	if err != nil {
	    fmt.Printf("❌ Failed to fetch JWKS: %v\n", err)
		return "", &errs.Error{
			Code:    errs.Internal,
			Message: "failed to fetch JWKS",
		}
	}

	// Parse and validate the JWT token with required claims and validation options
	parsedToken, err := jwt.ParseWithClaims(
		token,
		&RequiredClaims{},
		jwks.Keyfunc,
		// Expect the token to be intended for this API resource
		jwt.WithAudience(authConfig.ApiResourceIndicator()),
		// Expect the token to be issued by this issuer
		jwt.WithIssuer(authConfig.Issuer()),
		// Allow some leeway for clock skew
		jwt.WithLeeway(time.Minute*10),
	)

	// Check if there were any errors during token parsing
	if err != nil {
	    fmt.Printf("❌ Token parse/validation error: %v\n", err)
		return "", &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token",
		}
	}

	// Debug log claims
// 	fmt.Printf("Token Issuer: %s\n", claims.Issuer)
// 	fmt.Printf("Token Audience: %v\n", claims.Audience)
// 	fmt.Printf("Token Subject (sub): %s\n", claims.Subject)
// 	fmt.Printf("Token ClientID: %s\n", claims.ClientID)
// 	fmt.Printf("Token AZP: %s\n", claims.AZP)

	// Verify that the client ID in the token matches the expected client ID
	if parsedToken.Claims.(*RequiredClaims).ClientID != authConfig.ClientId() {
		return "", &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token",
		}
	}

	// Extract the user ID (subject) from the token claims
	userId, err := parsedToken.Claims.GetSubject()
	if err != nil {
	    fmt.Printf("❌ Failed to get subject: %v\n", err)
		return "", &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "invalid token",
		}
	}

	fmt.Printf("✅ Auth success. UserID: %s\n", userId)
	// Return the user ID as an Encore auth.UID
	return auth.UID(userId), nil
}