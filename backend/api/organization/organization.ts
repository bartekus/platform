import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { logto } from "~encore/clients";
import log from "encore.dev/log";

import { CreateOrganizationParams, Organization, OrganizationRole, GetOrganizationsParams, GetOrganizationsResponse } from "./types";
import { LogtoAPIResponse } from "../logto/types";

// HELPERS

async function fetchUserRoleForOrg(orgId: string, userId: string) {
  // The orgId is provided by the users by way of fetchUserInfo from useLogto
  // This prevents having to query all organizations and searching within the returned data for the user rols
  const { data: userRoles } = await logto.callApi({
    path: `/api/organizations/${orgId}/users/${userId}/roles`,
    method: "GET",
  });

  const roles = userRoles ?? [];

  console.log("roles", roles);

  return roles.find((r: { name: string }) => r.name);
}

// ENDPOINT

// Create organization endpoint
export const createOrganization = api(
  {
    expose: true,
    auth: true,
    method: "POST",
    path: "/api/organizations",
  },
  async (params: CreateOrganizationParams): Promise<Organization> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated("User not authenticated");
    }

    try {
      // Create organization using Logto API
      const { data: organization }: LogtoAPIResponse<Organization> = await logto.callApi({
        path: "/api/organizations",
        method: "POST",
        body: JSON.stringify(params),
      });

      if (!organization) {
        throw APIError.internal("Failed to create organization: No organization data returned");
      }

      // Add current user to organization
      await logto.callApi({
        path: `/api/organizations/${organization.id}/users`,
        method: "POST",
        body: JSON.stringify({
          userIds: [auth.userID],
        }),
      });

      // Get organization roles
      const { data: rolesData }: LogtoAPIResponse<OrganizationRole> = await logto.callApi({
        path: `/api/organization-roles`,
        method: "GET",
      });

      if (!rolesData) {
        throw APIError.failedPrecondition("Organization roles are missing");
      }

      const roles: OrganizationRole[] = JSON.parse(rolesData as unknown as string);

      // Find the `Admin` role
      const adminRole = roles.find((role) => role.name === "admin");
      if (!adminRole) {
        throw APIError.failedPrecondition("Organization admin role is missing");
      }

      await logto.callApi({
        path: `/api/organizations/${organization.id}/users/${auth.userID}/roles`,
        method: "POST",
        body: JSON.stringify({
          organizationRoleIds: [adminRole.id],
        }),
      });

      const returnPayload = {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        role: adminRole.name,
      };

      log.debug("Organization created", returnPayload);

      return returnPayload as Organization;
    } catch (error) {
      log.error("Failed to create organization", {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to create organization");
    }
  }
);

// Update getOrganizations endpoint
export const getAllOrganizationsByIdList = api(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/api/organizations",
  },
  async (params: GetOrganizationsParams): Promise<GetOrganizationsResponse> => {
    const auth = getAuthData();
    if (!auth) throw APIError.unauthenticated("User not authenticated");
    if (!params.orgIdsList) throw APIError.unauthenticated("No orgIdsList provided");

    try {
      const { data: organizations } = await logto.callApi({
        path: `/api/organizations`,
        method: "GET",
      });

      const list = organizations ?? [];

      if (list.length === 0) {
        return { organizations: [] };
      }

      const requestedOrgIds = params.orgIdsList;

      const filtered = list.filter((org: Organization) => requestedOrgIds.includes(org.id));

      // Resolve the current user's roles for each org in parallel
      const requestedOrgs = await Promise.all(
        filtered.map(async (org: Organization) => {
          const { role } = await fetchUserRoleForOrg(org.id, auth.userID);
          const withRoles: Organization = {
            id: org.id,
            name: org.name,
            description: org.description,
            role,
          };
          return withRoles;
        })
      );

      console.log("requestedOrgs", requestedOrgs);

      return { organizations: requestedOrgs };
    } catch (error) {
      log.error("Failed to fetch organizations", {
        error: error instanceof Error ? error.message : String(error),
        userId: auth.userID,
      });
      if (error instanceof APIError) throw error;
      throw APIError.internal("Failed to fetch organizations");
    }
  }
);

// Get a single organization by ID
export const getOrganizationById = api(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/api/organizations/:id",
  },
  async (params: { id: string }): Promise<Organization> => {
    const auth = getAuthData();
    if (!auth) throw APIError.unauthenticated("User not authenticated");

    try {
      const { data: organization } = await logto.callApi({
        path: `/api/organizations/${params.id}`,
        method: "GET",
      });

      if (!organization) throw APIError.notFound("Organization not found");

      // Get the requesting user's roles in this org
      const { role } = await fetchUserRoleForOrg(params.id, auth.userID);

      console.log("role", role);

      const result: Organization = {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        role: role,
      };

      return result;
    } catch (error) {
      log.error("Failed to fetch organization", {
        error: error instanceof Error ? error.message : String(error),
        organizationId: params.id,
        userId: auth.userID,
      });
      if (error instanceof APIError) throw error;
      throw APIError.internal("Failed to fetch organization");
    }
  }
);
