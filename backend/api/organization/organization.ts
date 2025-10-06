import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { logto } from "~encore/clients";
import log from "encore.dev/log";

import {
  CreateOrganizationParams,
  OrganizationsResponse,
  Organization,
  Role,
  OrganizationRole,
  OrganizationWithRoles,
  GetOrganizationsParams,
} from "./types";
import { LogtoAPIResponse } from "../logto/types";

// HELPERS

async function fetchUserRolesForOrg(orgId: string, userId: string) {
  // If the user is not a member, Logto might return 404/403. Treat as "no roles".
  try {
    const { data: userRoles } = await logto.callApi({
      path: `/api/organizations/${orgId}/users/${userId}/roles`,
      method: "GET",
    });

    console.dir(userRoles);

    const roles = userRoles ?? [];
    const roleNames = roles.map((r: { name: string }) => r.name);
    const isAdmin = roleNames.includes("admin");
    return { roles, roleNames, isAdmin };
  } catch (e: any) {
    // Detect 403/404 without relying on exact error shape
    const message = e instanceof Error ? e.message : String(e);
    const notMember =
      message.includes("403") ||
      message.includes("404") ||
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("forbidden");

    if (notMember) {
      return { roles: [] as Role[], roleNames: [] as string[], isAdmin: false };
    }
    // bubble up unexpected errors
    throw e;
  }
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

      const roles: Role[] = JSON.parse(rolesData as unknown as string);

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
  async (params: GetOrganizationsParams): Promise<OrganizationsResponse> => {
    const auth = getAuthData();
    if (!auth) throw APIError.unauthenticated("User not authenticated");
    if (!params.orgList) throw APIError.unauthenticated("No orgList provided");

    try {
      const { data: organizations } = await logto.callApi({
        path: `/api/organizations`,
        method: "GET",
      });

      const list = organizations ?? [];

      if (list.length === 0) {
        return { organizations: [] };
      }

      const requestedOrgIds = params.orgList;

      const filtered = list.filter((org: Organization) => requestedOrgIds.includes(org.id));

      // Resolve the current user's roles for each org in parallel
      const requestedOrgs = await Promise.all(
        filtered.map(async (org: Organization) => {
          const { roles, roleNames, isAdmin } = await fetchUserRolesForOrg(org.id, auth.userID);
          const withRoles: OrganizationWithRoles = {
            id: org.id,
            name: org.name,
            description: org.description,
            roles,
            roleNames,
            isAdmin,
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
  async (params: { id: string }): Promise<OrganizationWithRoles> => {
    const auth = getAuthData();
    if (!auth) throw APIError.unauthenticated("User not authenticated");

    try {
      const { data: organization } = await logto.callApi({
        path: `/api/organizations/${params.id}`,
        method: "GET",
      });

      if (!organization) throw APIError.notFound("Organization not found");

      // Get the requesting user's roles in this org
      const { roles, roleNames, isAdmin } = await fetchUserRolesForOrg(params.id, auth.userID);

      const result: OrganizationWithRoles = {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        roles,
        roleNames,
        isAdmin,
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
