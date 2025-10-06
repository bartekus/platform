import { useCallback } from "react";
import { useLogto } from "@logto/react";

import getRequestClient from "~/lib/get-request-client";

import { Organization, CreateOrganizationParams } from "~/types";

export const useOrganizationApi = () => {
  const { getAccessToken } = useLogto();

  return {
    createOrganization: useCallback(
      async (params: CreateOrganizationParams): Promise<Organization> => {
        const token = await getAccessToken();
        if (!token) throw new Error("User not authenticated");

        const client = getRequestClient(token);
        const organization = await client.organization.createOneOrganization(params);

        // console.log("createOrganization organization", organization);

        return organization;
      },
      [getAccessToken]
    ),
  };
};
