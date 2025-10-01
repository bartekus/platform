import { api, APIError } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import { logto } from '~encore/clients';
import log from 'encore.dev/log';

import { CreateOrganizationParams, OrganizationsResponse, Organization, Role } from './types';
import { LogtoAPIResponse, OrganizationRole } from '../logto/types';

// Create organization endpoint
export const createOneOrganization = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'POST',
    path: '/api/organizations',
  },
  async (params: CreateOrganizationParams): Promise<Organization> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated('User not authenticated');
    }

    try {
      // Create organization using the client import
      const { data: organization }: LogtoAPIResponse<Organization> = await logto.callApi({
        path: '/api/organizations',
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (!organization) {
        throw APIError.internal('Failed to create organization: No organization data returned');
      }

      // Add current user to organization
      await logto.callApi({
        path: `/api/organizations/${organization.id}/users`,
        method: 'POST',
        body: JSON.stringify({
          userIds: [auth.userID],
        }),
      });

      // Get organization roles
      const { data: rolesData }: LogtoAPIResponse<OrganizationRole> = await logto.callApi({
        path: `/api/organization-roles`,
        method: 'GET',
      });

      if (!rolesData) {
        throw APIError.failedPrecondition('Organization roles are missing');
      }

      const roles: Role[] = JSON.parse(rolesData as unknown as string);

      // Find the `Admin` role
      const adminRole = roles.find((role) => role.name === 'admin');
      if (!adminRole) {
        throw APIError.failedPrecondition('Organization admin role is missing');
      }

      await logto.callApi({
        path: `/api/organizations/${organization.id}/users/${auth.userID}/roles`,
        method: 'POST',
        body: JSON.stringify({
          organizationRoleIds: [adminRole.id],
        }),
      });

      const returnPayload = {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      };

      log.debug('Organization created', returnPayload);

      return returnPayload as Organization;
    } catch (error) {
      log.error('Failed to create organization', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal('Failed to create organization');
    }
  },
);

// Update getOrganizations endpoint
export const getAllOrganizations = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'GET',
    path: '/api/organizations',
  },
  async (): Promise<OrganizationsResponse> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated('User not authenticated');
    }

    try {
      const { data: organizations }: LogtoAPIResponse<Organization[]> = await logto.callApi({
        path: `/api/organizations`,
        method: 'GET',
      });

      console.log(' ');
      console.log(' ');
      console.log('organizations', organizations);
      console.log(' ');
      console.log(' ');

      if (!organizations) {
        return { organizations: [] };
      }

      return { organizations };
    } catch (error) {
      log.error('Failed to fetch organizations', {
        error: error instanceof Error ? error.message : String(error),
        userId: auth.userID,
      });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal('Failed to fetch organizations');
    }
  },
);

// Get a single organization by ID
export const getOneOrganization = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'GET',
    path: '/api/organizations/:id',
  },
  async (params: { id: string }): Promise<Organization> => {
    const auth = getAuthData();
    if (!auth) {
      throw APIError.unauthenticated('User not authenticated');
    }

    try {
      // Get organization details from Logto
      const { data: organization }: LogtoAPIResponse<Organization> = await logto.callApi({
        path: `/api/organizations/${params.id}`,
        method: 'GET',
      });

      if (!organization) {
        throw APIError.notFound('Organization not found');
      }

      // Get user's role in the organization
      const { data: userRoles }: LogtoAPIResponse<OrganizationRole[]> = await logto.callApi({
        path: `/api/organizations/${params.id}/users/${auth.userID}/roles`,
        method: 'GET',
      });

      // Map to our Organization type
      return {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      };
    } catch (error) {
      log.error('Failed to fetch organization', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: params.id,
        userId: auth.userID,
      });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal('Failed to fetch organization');
    }
  },
);
