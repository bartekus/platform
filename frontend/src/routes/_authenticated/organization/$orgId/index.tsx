import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";

import { workspacesCollection } from "~/lib/collections-new";
import { useResourceApi } from "~/lib/api/resource";
import { useWorkspaceApi } from "~/lib/api/workspace";
import { useAuth } from "~/lib/use-auth";

export const Route = createFileRoute("/_authenticated/organization/$orgId/")({
  component: OrganizationDetail,
  ssr: false,
  loader: async () => {
    await workspacesCollection.preload();
    return null;
  },
});

function OrganizationDetail() {
  const { orgId } = Route.useParams();
  const navigate = useNavigate();
  const { getUserOrganizationScopes } = useAuth();
  const { getWorkspaces, updateWorkspace, deleteWorkspace } = useWorkspaceApi();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userScopes, setUserScopes] = useState<string[]>([]);

  // Real-time workspaces from Electric SQL
  const { data: electricWorkspaces } = useLiveQuery(
    (q) => q.from({ workspacesCollection })
      .where(eq(workspacesCollection.organization_id, orgId))
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [scopes, workspacesData] = await Promise.all([
          getUserOrganizationScopes(orgId),
          getWorkspaces(orgId)
        ]);

        setUserScopes(scopes);
        setWorkspaces(workspacesData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [orgId, getUserOrganizationScopes, getWorkspaces]);

  const handleWorkspaceClick = (workspaceId: string) => {
    navigate({ to: `/organization/${orgId}/workspace/${workspaceId}` });
  };

  const handleWorkspaceEdit = (workspaceId: string) => {
    // TODO: Implement workspace editing
    console.log('Edit workspace:', workspaceId);
  };

  const handleWorkspaceDelete = (workspaceId: string) => {
    if (!orgId) return;
    void deleteWorkspace(orgId, workspaceId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading workspaces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          {userScopes.includes('create:resources') && (
            <button
              onClick={() => {
                // TODO: Open create workspace dialog
                console.log('Create workspace');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Workspace
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-8">
                <p className="text-gray-500">No workspaces yet. Create one to get started!</p>
              </div>
            </div>
          ) : (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-6 cursor-pointer"
                onClick={() => handleWorkspaceClick(workspace.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{workspace.title}</h3>
                  <div className="flex gap-2">
                    {userScopes.includes('edit:resources') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkspaceEdit(workspace.id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                    {userScopes.includes('delete:resources') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkspaceDelete(workspace.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {workspace.preview && (
                  <p className="text-sm text-gray-600 mb-4">{workspace.preview}</p>
                )}
                <div className="text-xs text-gray-500">
                  Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
