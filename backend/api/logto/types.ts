export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TokenCache {
  token: string;
  expiresAt: number;
}

// Export interfaces for service-to-service communication
export interface LogtoAPIOptions {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface TokenResult {
  token: string;
}

export interface LogtoAPIResponse<T> {
  data?: T;
}

// Organization Invitation Types
// GET/POST /api/organization-invitations
// GET /api/organization-invitations/{id}
export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  status: 'pending' | 'accepted';
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
  type: 'User' | 'Application';
  organizationScopes?: OrganizationScope[];
  resourceScopes?: ResourceScope[];
}

// GET /api/organization-roles
export interface OrganizationRolesResponse {
  totalCount: number;
  list: OrganizationRole[];
}

// GET /api/organization-scopes
export interface OrganizationScopesResponse {
  totalCount: number;
  list: OrganizationScope[];
}

// GET/POST /api/organizations
// GET/PATCH /api/organizations/{id}
export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// GET /api/organizations
export interface OrganizationsResponse {
  totalCount: number;
  list: Organization[];
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

// Organization Application Types
// GET /api/organizations/{id}/applications response item
export interface OrganizationApplication {
  id: string;
  name: string;
  description?: string;
  type: string;
  roleNames: string[];
}

// JIT (Just-In-Time) Types
// GET /api/organizations/{id}/jit/email-domains
export interface JITEmailDomainsResponse {
  domains: string[];
}

// GET /api/organizations/{id}/jit/sso-connectors
export interface JITSSOConnectorsResponse {
  connectors: string[];
}
