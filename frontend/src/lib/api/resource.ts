import { useCallback } from "react";
import { useLogto } from "@logto/react";

import getRequestClient from "~/lib/get-request-client";
import { organization } from "~/lib/client";

import Organization = organization.Organization;
import CreateOrganizationParams = organization.CreateOrganizationParams;
import { type OrganizationData } from "~/types/organization";
import { appConfig } from "~/config/logto";

export type { Organization };

export const useResourceApi = () => {
  const { getAccessToken, getOrganizationToken, getOrganizationTokenClaims, fetchUserInfo } = useLogto();

  return {
    createOrganization: useCallback(
      async (params: CreateOrganizationParams): Promise<Organization> => {
        const token = await getAccessToken(appConfig.apiResourceIndicator);
        if (!token) throw new Error("User not authenticated");

        const client = getRequestClient(token);
        const organization = await client.organization.createOneOrganization(params);

        console.log("createOrganization organization", organization);

        return organization;
      },
      [getAccessToken]
    ),

    getOrganizations: useCallback(async (): Promise<Organization[]> => {
      const token = await getAccessToken(appConfig.apiResourceIndicator);
      if (!token) throw new Error("User not authenticated");

      const userInfo = await fetchUserInfo();
      const organizations = (userInfo?.organization_data || []) as OrganizationData[];

      console.log("getOrganizations organizations", organizations);

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
      [getAccessToken, getOrganizationToken, getOrganizationTokenClaims]
    ),
  };
};
