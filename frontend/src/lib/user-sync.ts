import { trpc } from "~/lib/trpc-client";

// Global user info cache
let cachedUserInfo: any = null;

export function setCachedUserInfo(userInfo: any) {
  cachedUserInfo = userInfo;
}

export function getCachedUserInfo() {
  return cachedUserInfo;
}

// Sync user to database
export async function syncUserToDatabase(userInfo: any) {
  if (!userInfo) return;

  try {
    await trpc.users.upsert.mutate({
      id: userInfo.sub,
      name: userInfo.name || userInfo.username || "User",
      email: userInfo.email || `${userInfo.sub}@example.com`,
      image: userInfo.picture,
    });

    setCachedUserInfo(userInfo);
  } catch (error) {
    console.error("Failed to sync user to database:", error);
  }
}
