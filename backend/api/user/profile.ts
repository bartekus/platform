import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { logto } from "~encore/clients";
import log from "encore.dev/log";

import { User } from "./types";
import { LogtoAPIResponse } from "../logto/types";

// Create user update endpoint
export const updateUser = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: "POST",
    path: "/api/user/update",
  },
  async (params: User): Promise<User> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("User not authenticated");
    }

    console.log("auth", auth);

    const userId = auth.userID;

    try {
      // First update profile directly as this method performs a partial update of the profile object.
      const profile: LogtoAPIResponse<any> = await logto.callApi({
        path: `/api/users/${userId}/profile`,
        method: "POST",
        body: JSON.stringify({
          zoneinfo: params.profile?.zoneinfo || undefined, // example: "America/Edmonton"
          locale: params.profile?.locale || undefined, // example: "en-CA"
        }),
      });

      const user: LogtoAPIResponse<any> = await logto.callApi({
        path: `/api/users/${userId}`,
        method: "POST",
        body: JSON.stringify({
          username: params.username || undefined,
        }),
      });

      const returnPayload = {
        ...user,
        profile: { ...profile },
      };

      log.debug("User updated", returnPayload);

      return returnPayload as User;
    } catch (error) {
      log.error("Failed to update user", {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to update user");
    }
  }
);
