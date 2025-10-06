import type { LucideIcon } from "lucide-react";
import { file_upload, organization, workspace, user } from "~/lib/client";

import Organization = organization.Organization;
import OrganizationScope = organization.OrganizationScope;
import OrganizationData = organization.OrganizationScope;
import CreateOrganizationParams = organization.CreateOrganizationParams;
export type { Organization, OrganizationScope, OrganizationData, CreateOrganizationParams };

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

export interface FetchOptions extends RequestInit {
  skipContentType?: boolean;
  rawBody?: boolean;
}

export interface OrganizationCreateFormProps {
  onSuccess: (orgId: string) => void;
}

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface Project {
  name: string;
  url: string;
  icon: LucideIcon;
}
