export interface CreateOrganizationParams {
  name: string;
  description?: string;
}

export interface GetOrganizationsParams {
  orgList: string[];
}

// GET/POST /api/organizations
// GET/PATCH /api/organizations/{id}
export interface Organization {
  id: string;
  name: string;
  description?: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  scopes?: Array<{
    id: string;
    name: string;
  }>;
  resourceScopes?: Array<unknown>;
}

// Organization Invitation Types
// GET/POST /api/organization-invitations
// GET /api/organization-invitations/{id}
export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  status: "pending" | "accepted";
  createdAt: string;
  updatedAt: string;
}

// GET /api/organization-invitations
export interface OrganizationInvitationsResponse {
  totalCount: number;
  list: OrganizationInvitation[];
}

// Organization Role Types
// Used in OrganizationRole and UserScopesResponse
export interface OrganizationScope {
  id: string;
  name: string;
  description?: string;
}

// Used in OrganizationRole and UserScopesResponse
export interface ResourceScope {
  resource: string;
  scopes: string[];
}

// GET/POST /api/organization-roles
// GET/PATCH /api/organization-roles/{id}
export interface OrganizationRole {
  id: string;
  name: string;
  description?: string;
  type: "User" | "Application";
  organizationScopes?: OrganizationScope[];
  resourceScopes?: ResourceScope[];
}

export type OrganizationWithRoles = Organization & {
  roles: Role[]; // the roles THIS user has in this org
  roleNames: string[]; // convenience
  isAdmin: boolean; // convenience flag (role name === "admin")
};

// GET /api/organizations
export interface OrganizationsResponse {
  totalCount?: number;
  organizations: Organization[];
}

// Organization User Types
// Used in OrganizationUser
export interface UserIdentity {
  userId: string;
  details?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// GET /api/organizations/{id}/users response item
export interface OrganizationUser {
  id: string;
  name?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  username?: string;
  customData?: Record<string, unknown>;
  identities?: UserIdentity[];
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
  applicationId?: string;
  isSuspended: boolean;
  roleNames: string[];
}

// GET /api/organizations/{id}/users
export interface OrganizationUsersResponse {
  totalCount: number;
  list: OrganizationUser[];
}

// GET /api/organizations/{id}/users/{userId}/scopes
export interface UserScopesResponse {
  organizationScopes: OrganizationScope[];
  resourceScopes: ResourceScope[];
}
