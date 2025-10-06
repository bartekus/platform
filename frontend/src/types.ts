import type { LucideIcon } from "lucide-react";
import { file_upload, organization, workspace, user } from "~/lib/client";

import Organization = organization.Organization;
import OrganizationScope = organization.OrganizationScope;
import OrganizationData = organization.OrganizationScope;
import CreateOrganizationParams = organization.CreateOrganizationParams;
import GetOrganizationsParams = organization.GetOrganizationsParams;
import GetOrganizationsResponse = organization.GetOrganizationsResponse;
export type {
  Organization,
  OrganizationScope,
  OrganizationData,
  CreateOrganizationParams,
  GetOrganizationsParams,
  GetOrganizationsResponse,
};

import Workspace = workspace.Workspace;
import OrganizationWithRoles = organization.OrganizationWithRoles;
import CreateWorkspaceParams = workspace.CreateWorkspaceRequest;
// import GetWorkspaceParams = workspace.GetWorkspaceRequest;
import UpdateWorkspaceParams = workspace.UpdateWorkspaceRequest;

export type { Workspace, OrganizationWithRoles, CreateWorkspaceParams, UpdateWorkspaceParams };

import FileMetadata = file_upload.FileMetadata;
export type { FileMetadata };

import User = user.User;
import UserCustomData = user.CustomData;
import UserProfile = user.UserProfile;

export type { User, UserCustomData, UserProfile };

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface FetchOptions extends RequestInit {
  skipContentType?: boolean;
  rawBody?: boolean;
}

export interface OrganizationCreateFormProps {
  onSuccess: (orgId: string) => void;
}
