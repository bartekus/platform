import { logtoApiEndpoint } from "~/config/logto";
import { UserInfo, UserCustomData } from "~/types";

export async function fetchUserInfo(getAccessToken: () => Promise<string | undefined>): Promise<UserInfo> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token");
  }

  const res = await fetch(`${logtoApiEndpoint}/oidc/me`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load userInfo");
  }

  return res.json();
}

// Whatever “done” means for you:
export function needsOnboarding(userInfo?: UserInfo) {
  console.log("userInfo");
  console.dir(userInfo, { depth: null });

  const customData = userInfo?.custom_data as UserCustomData;

  // Check subscription status from custom_data
  const hasActiveSubscription = customData?.subscription?.status === "active";
  // Check userInfo status from userInfo
  const hasUsername = !!userInfo?.username;
  // Check userInfo status from userInfo
  const hasOrganization = userInfo?.organizations && userInfo?.organizations?.length > 0;

  if (!hasActiveSubscription) {
    return true;
  }

  if (hasActiveSubscription && !hasUsername) {
    return true;
  }

  if (hasActiveSubscription && hasUsername && !hasOrganization) {
    return true;
  }

  if (hasActiveSubscription && hasUsername && hasOrganization) {
    return true;
  }

  return false;
}
