import { useCallback } from "react";
import { useLogto } from "@logto/react";

import getRequestClient from "~/lib/get-request-client";

import { Organization, CreateOrganizationParams, GetOrganizationsResponse, GetOrganizationsParams } from "~/types";

export const useOrganizationApi = () => {
  const { getAccessToken } = useLogto();

  return {
    createOrganization: useCallback(
      async (params: CreateOrganizationParams): Promise<Organization> => {
        const token = await getAccessToken();
        if (!token) throw new Error("User not authenticated");

        const client = getRequestClient(token);
        const organization = await client.organization.createOrganization(params);

        // console.log("createOrganization organization", organization);

        return organization;
      },
      [getAccessToken]
    ),

    getAllOrganizations: useCallback(
      async (params: GetOrganizationsParams): Promise<GetOrganizationsResponse> => {
        const token = await getAccessToken();
        if (!token) throw new Error("User not authenticated");

        const client = getRequestClient(token);
        const organization: GetOrganizationsResponse = await client.organization.getAllOrganizationsByIdList(params);

        // console.log("createOrganization organization", organization);

        return organization;
      },
      [getAccessToken]
    ),
  };
};
