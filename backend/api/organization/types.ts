export interface CreateOrganizationParams {
  name: string;
  description: string;
}

export interface GetOrganizationsParams {
  orgIdsList: string[];
}

// GET/POST /api/organizations
// GET/PATCH /api/organizations/{id}
export interface Organization {
  id: string;
  name: string;
  description: string;
  role?: string;
}

export interface GetOrganizationsResponse {
  organizations: Organization[];
}

export interface OrganizationRole {
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
