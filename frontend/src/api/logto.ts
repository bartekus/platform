import { logtoApiEndpoint } from "~/config/logto";
import { User, UserCustomData } from "~/types";
// import { redirect } from "@tanstack/react-router";

export async function fetchUserInfo(getAccessToken: () => Promise<string | undefined>): Promise<User> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token");
  }

  const res = await fetch(`${logtoApiEndpoint}/oidc/me`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    credentials: "include",
  });

  console.log("res", res);
  console.log("!res.ok", !res.ok);

  if (!res.ok) {
    // throw redirect({
    //   to: "/signin",
    //   search: {
    //     // Use the current location to power a redirect after login
    //     // (Do not use `router.state.resolvedLocation` as it can
    //     // potentially lag behind the actual current location)
    //     redirect: location.href,
    //   },
    // });

    throw new Error("Failed to load user");
  }

  return res.json();
}

export function needsOnboarding(user?: User) {
  const customData = user?.custom_data as UserCustomData | undefined;
  const hasActiveSubscription = customData?.subscription?.status === "active";
  const hasUsername = !!user?.username;
  const hasOrganization = !!(user?.organizations && user.organizations.length > 0);

  if (!hasActiveSubscription) return true;
  if (hasActiveSubscription && !hasUsername) return true;
  if (hasActiveSubscription && hasUsername && !hasOrganization) return true;

  // Everything satisfied → no onboarding needed
  return false;
}

export function nextRouteFor(user: User): string {
  const cd = user?.custom_data as UserCustomData | undefined;
  const okSub = cd?.subscription?.status === "active";
  const hasUser = !!user?.username;
  const firstOrg = user?.organizations?.[0];

  if (!okSub) return "/onboarding/subscription";
  if (okSub && !hasUser) return "/onboarding/profile";
  if (okSub && hasUser && !firstOrg) return "/onboarding/organization";
  return firstOrg ? `/dashboard/org/${firstOrg}` : "/";
}
