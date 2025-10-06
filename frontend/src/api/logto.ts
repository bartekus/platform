import { useCallback } from "react";
import { useLogto } from "@logto/react";

import { Organization, OrganizationData } from "~/types";

export const useLogtoApi = () => {
  const { getAccessToken, getOrganizationToken, getOrganizationTokenClaims, fetchUserInfo } = useLogto();

  return {
    getUserOrganizations: useCallback(async (): Promise<Organization[]> => {
      const token = await getAccessToken();
      if (!token) throw new Error("User not authenticated");

      const user = await fetchUserInfo();
      const organizations = (user?.organization_data || []) as OrganizationData[];

      // console.log("getOrganizations organizations", organizations);

      return organizations;
    }, [getAccessToken, fetchUserInfo]),

    getUserOrganizationScopes: useCallback(
      async (organizationId: string): Promise<string[]> => {
        const organizationToken = await getOrganizationToken(organizationId);

        if (!organizationToken) {
          throw new Error("User is not a member of the organization");
        }

        const tokenClaims = await getOrganizationTokenClaims(organizationId);

        // This ensures scope is treated as a string before splitting it, and filter(Boolean) removes any empty strings.
        const scopes = String(tokenClaims?.scope || "")
          .split(" ")
          .filter(Boolean);

        return scopes;
      },
      [getOrganizationToken, getOrganizationTokenClaims]
    ),
  };
};
