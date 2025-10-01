import { LogtoClient, type UserInfoResponse } from "@logto/react";
import { config } from "~/config/logto";

// Create a singleton Logto client instance
let logtoClient: LogtoClient | null = null;

export function getLogtoClient(): LogtoClient {
  if (typeof window === "undefined") {
    throw new Error("Logto client can only be used in the browser");
  }

  if (!logtoClient) {
    logtoClient = new LogtoClient(config);
  }

  return logtoClient;
}

// Helper to get user info with proper typing
export async function getLogtoUserInfo(): Promise<UserInfoResponse | null> {
  try {
    const client = getLogtoClient();
    const isAuthenticated = await client.isAuthenticated();

    if (!isAuthenticated) {
      return null;
    }

    return await client.fetchUserInfo();
  } catch (error) {
    console.error("Error fetching Logto user info:", error);
    return null;
  }
}

// Helper to get access token
export async function getLogtoAccessToken(): Promise<string | null> {
  try {
    const client = getLogtoClient();
    const isAuthenticated = await client.isAuthenticated();

    if (!isAuthenticated) {
      return null;
    }

    return await client.getAccessToken(config.resources?.[1] || "");
  } catch (error) {
    console.error("Error getting Logto access token:", error);
    return null;
  }
}
