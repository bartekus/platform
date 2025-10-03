import type { LucideIcon } from "lucide-react";
import { file_upload, organization, workspace } from "~/lib/client";

import Organization = organization.Organization;
import CreateOrganizationParams = organization.CreateOrganizationParams;
export type { Organization, CreateOrganizationParams };

import Workspace = workspace.Workspace;
import CreateWorkspaceParams = workspace.CreateWorkspaceRequest;
// import GetWorkspaceParams = workspace.GetWorkspaceRequest;
import UpdateWorkspaceParams = workspace.UpdateWorkspaceRequest;

export type { Workspace, CreateWorkspaceParams, UpdateWorkspaceParams };

import FileMetadata = file_upload.FileMetadata;
export type { FileMetadata };

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

export interface OrganizationData {
  id: string;
  name: string;
  description: string | null;
  logo?: LucideIcon;
  plan?: string;
  role?: string;
}

export interface UserSubscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;
}

export interface UserCustomData {
  subscription?: UserSubscription;
  stripeCustomerId?: string;
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

export interface UserData {
  name: string;
  email: string;
  avatar?: string;
}
