import { useCallback } from 'react';
import { useLogto } from '@logto/react';

import { workspace } from '~/lib/client';
import getRequestClient from '~/lib/get-request-client';

import CreateWorkspaceParams = workspace.CreateWorkspaceRequest;
import GetWorkspaceParams = workspace.GetWorkspaceRequest;
import UpdateWorkspaceParams = workspace.UpdateWorkspaceRequest;
import Workspace = workspace.Workspace;

export type { Workspace };

export const useWorkspaceApi = () => {
  const { getOrganizationToken } = useLogto();

  return {
    getWorkspaces: useCallback(
      async (organizationId: string): Promise<Workspace[]> => {
        const token = await getOrganizationToken(organizationId);
        if (!token) throw new Error('User is not a member of the organization');

        const client = getRequestClient(token);
        const response = await client.workspace.getAllWorkspaces();
        return response.workspaces;
      },
      [getOrganizationToken],
    ),

    getWorkspace: useCallback(
      async (orgId: string, workspaceId: string): Promise<Workspace> => {
        const token = await getOrganizationToken(orgId);
        if (!token) throw new Error('User is not a member of the organization');

        const client = getRequestClient(token);
        const response = await client.workspace.getOneWorkspace(workspaceId);
        return response.workspace;
      },
      [getOrganizationToken],
    ),

    createWorkspace: useCallback(
      async (orgId: string, params: CreateWorkspaceParams): Promise<Workspace> => {
        const token = await getOrganizationToken(orgId);
        if (!token) throw new Error('User is not a member of the organization');

        const client = getRequestClient(token);
        const response = await client.workspace.createOneWorkspace(params);
        return response.workspace;
      },
      [getOrganizationToken],
    ),

    updateWorkspace: useCallback(
      async (orgId: string, workspaceId: string, data: UpdateWorkspaceParams) => {
        const token = await getOrganizationToken(orgId);
        if (!token) throw new Error('User is not a member of the organization');

        const client = getRequestClient(token);
        const response = await client.workspace.updateOneWorkspace(workspaceId, data);
        return response.workspace;
      },
      [getOrganizationToken],
    ),

    deleteWorkspace: useCallback(
      async (orgId: string, workspaceId: string): Promise<void> => {
        const token = await getOrganizationToken(orgId);
        if (!token) throw new Error('User is not a member of the organization');

        const client = getRequestClient(token);
        await client.api.deleteOneWorkspace(workspaceId);
      },
      [getOrganizationToken],
    ),
  };
};
