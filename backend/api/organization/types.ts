export interface CreateOrganizationParams {
  name: string;
  description?: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
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
