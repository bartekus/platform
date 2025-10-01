import { getLogtoClient } from "~/lib/logto-client";
import { appConfig } from "~/config/logto";

// Server-side auth handler for API routes
export async function getLogtoSession(request: Request) {
  // Extract cookies from request
  const cookieHeader = request.headers.get("cookie") || "";

  // For TanStack Start SSR compatibility, we need to handle auth on the client side
  // This function is mainly for documentation - actual auth checking happens client-side
  return null;
}

// Client-side helpers
export async function signInWithLogto() {
  if (typeof window === "undefined") return;

  const client = getLogtoClient();
  await client.signIn(appConfig.signInRedirectUri);
}

export async function signOutWithLogto() {
  if (typeof window === "undefined") return;

  const client = getLogtoClient();
  await client.signOut(appConfig.signOutRedirectUri);
}

export async function handleLogtoCallback() {
  if (typeof window === "undefined") return;

  const client = getLogtoClient();
  await client.handleSignInCallback(window.location.href);
}
