import { useLogto } from "@logto/react";
import { useCallback } from "react";

import { authConfig, encoreApiEndpoint } from "~/config/logto";

import { ApiRequestError } from "~/types";
import type { FetchOptions } from "~/types";

export const useRawApi = () => {
  const { getAccessToken, getOrganizationToken } = useLogto();

  const getToken = useCallback(
    async (organizationId?: string): Promise<string> => {
      let token: string | undefined;

      if (organizationId) {
        token = await getOrganizationToken(organizationId);
      } else {
        token = await getAccessToken(authConfig.apiResourceIndicator);
      }

      if (!token) {
        throw new Error(organizationId ? "User is not a member of the organization" : "Failed to get access token");
      }

      return token;
    },
    [getAccessToken, getOrganizationToken]
  );

  const fetchWithToken = useCallback(
    async (path: string, options: FetchOptions = {}, organizationId?: string) => {
      try {
        const token = await getToken(organizationId);

        const headers = new Headers(options.headers);

        if (!options.skipContentType) {
          headers.set("Content-Type", "application/json");
        }

        headers.set("Authorization", `Bearer ${token}`);

        if (organizationId) {
          headers.set("Organization-Id", organizationId);
        }

        let body = options.body;
        if (body && !options.rawBody && !(body instanceof FormData)) {
          if (typeof body === "string") {
            // If it's already a string, assume it's already JSON
            body = JSON.parse(body);
          }
          body = JSON.stringify(body);
        }

        const response = await fetch(`${encoreApiEndpoint}/${path}`, {
          ...options,
          headers,
          body,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new ApiRequestError(error.message || "Request failed", response.status);
        }

        return response;
      } catch (error) {
        if (error instanceof ApiRequestError) {
          throw error;
        }
        throw new ApiRequestError(error instanceof Error ? error.message : String(error));
      }
    },
    [getToken]
  );

  return { getToken, fetchWithToken };
};
