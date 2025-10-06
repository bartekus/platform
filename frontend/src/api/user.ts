import { useCallback } from "react";
import { useLogto } from "@logto/react";

import getRequestClient from "~/lib/get-request-client";

import type { User } from "~/types";
import { authConfig } from "~/config/logto";

const { apiResourceIndicator } = authConfig;

export const useUserApi = () => {
  const { getAccessToken } = useLogto();

  return {
    updateUserProfile: useCallback(
      async (params: User): Promise<User> => {
        const token = await getAccessToken(apiResourceIndicator);
        if (!token) throw new Error("User not authenticated");

        const client = getRequestClient(token);
        const user = await client.user.updateUser(params);

        // console.log("User profile update", user);

        return user;
      },
      [getAccessToken]
    ),
  };
};
