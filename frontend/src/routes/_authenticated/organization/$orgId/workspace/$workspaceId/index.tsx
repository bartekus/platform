import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";

import { workspacesCollection, filesCollection } from "~/lib/collections-new";
import { useResourceApi } from "~/lib/api/resource";
import { useWorkspaceApi } from "~/lib/api/workspace";
import { useFileApi } from "~/lib/api/file";
import { useAuth } from "~/lib/use-auth";

export const Route = createFileRoute("/_authenticated/organization/$orgId/workspace/$workspaceId/")({
  component: WorkspaceDetail,
  ssr: false,
  loader: async () => {
    await Promise.all([workspacesCollection.preload(), filesCollection.preload()]);
    return null;
  },
});

function WorkspaceDetail() {
  const { orgId, workspaceId } = Route.useParams();
  const { getUserOrganizationScopes } = useAuth();
  const { getWorkspace } = useWorkspaceApi();
  const { listFiles } = useFileApi();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [userScopes, setUserScopes] = useState<string[]>([]);

  // Real-time workspace from Electric SQL
  const { data: electricWorkspaces } = useLiveQuery(
    (q) => q.from({ workspacesCollection })
      .where(eq(workspacesCollection.id, workspaceId))
  );

  // Real-time files from Electric SQL
  const { data: electricFiles } = useLiveQuery(
    (q) => q.from({ filesCollection })
      .where(eq(filesCollection.workspace_id, workspaceId))
  );

  const loadFiles = useCallback(async () => {
    if (!orgId || !workspaceId) return;
    try {
      const files = await listFiles(orgId, workspaceId);
      setFiles(files);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, [orgId, workspaceId, listFiles]);

  const fetchData = useCallback(async () => {
    if (!orgId || !workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const [scopes, workspaceData] = await Promise.all([
        getUserOrganizationScopes(orgId),
        getWorkspace(orgId, workspaceId)
      ]);

      setUserScopes(scopes);
      setWorkspace(workspaceData);
      await loadFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [orgId, workspaceId, getUserOrganizationScopes, getWorkspace, loadFiles]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleUploadComplete = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading workspace...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {workspace?.title || 'Workspace'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // TODO: Open file upload dialog
                console.log('Upload file');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Upload File
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Workspace Content */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
            <div className="prose max-w-none">
              {workspace?.content || (
                <p className="text-gray-500 italic">No content yet. Start editing to add content.</p>
              )}
            </div>
          </div>

          {/* Files Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>
            {files.length === 0 ? (
              <p className="text-gray-500 italic">No files uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {file.mimeType} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </a>
                      {userScopes.includes('delete:resources') && (
                        <button
                          onClick={() => {
                            // TODO: Implement file deletion
                            console.log('Delete file:', file.name);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
