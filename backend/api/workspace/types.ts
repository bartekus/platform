export interface Workspace {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  updatedBy: string;
  content: string;
}

export interface CreateWorkspaceRequest {
  title: string;
  content: string;
}

export interface CreateWorkspaceResponse {
  workspace: Workspace;
}

export interface GetWorkspaceRequest {
  id: string;
}

export interface GetWorkspaceResponse {
  workspace: Workspace;
}

export interface UpdateWorkspaceRequest {
  id: string;
  title: string;
  content: string;
}

export interface UpdateWorkspaceResponse {
  workspace: Workspace;
}

export interface DeleteWorkspaceResponse {
  success: boolean;
}
