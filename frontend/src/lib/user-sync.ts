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
    // Generate a proper email if not provided by Logto
    const email = userInfo.email || `${userInfo.sub}@logto.localdev.online`;
    
    await trpc.users.upsert.mutate({
      id: userInfo.sub,
      name: userInfo.name || userInfo.username || "User",
      email: email,
      image: userInfo.picture, // Use 'picture' instead of 'image'
    });

    setCachedUserInfo(userInfo);
  } catch (error) {
    console.error("Failed to sync user to database:", error);
  }
}
