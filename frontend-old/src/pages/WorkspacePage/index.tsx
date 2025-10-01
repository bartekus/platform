import { useParams } from 'react-router';
import { useCallback, useEffect, useState } from 'react';
import { useResourceApi } from '~/api/resource';
import { useFileApi, type FileInfo } from '~/api/file';
import { useWorkspaceApi, type Workspace } from '~/api/workspace';
import { FileList } from './components/FileList';
import { useLogto } from '@logto/react';
import { LoadingSpinner } from '~/components/loading-spinner';
import { ErrorMessage } from '~/pages/OrganizationPage/components/ErrorMessage';
import { WorkspaceTopbar } from '~/components/workspace-topbar';
import { Button } from '~/components/ui/button';
import { Upload } from 'lucide-react';
import { FileUploadDialog } from './components/FileUpload';

export const WorkspacePage = () => {
  const { orgId, workspaceId } = useParams();
  const { isAuthenticated } = useLogto();
  const { getUserOrganizationScopes } = useResourceApi();
  const { getWorkspace } = useWorkspaceApi();
  const { listFiles } = useFileApi();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [userScopes, setUserScopes] = useState<string[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

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
    if (!orgId || !workspaceId || !isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const [scopes, workspaceData] = await Promise.all([getUserOrganizationScopes(orgId), getWorkspace(orgId, workspaceId)]);

      setUserScopes(scopes);
      setWorkspace(workspaceData);
      await loadFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [orgId, workspaceId, isAuthenticated, getUserOrganizationScopes, getWorkspace, loadFiles]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleUploadComplete = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  const renderActions = () => {
    return (
      <Button onClick={() => setIsUploadDialogOpen(true)} size="sm">
        <Upload className="mr-2 h-4 w-4" />
        Upload File
      </Button>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="flex h-full flex-col">
      <WorkspaceTopbar
        title={workspace?.title || 'Workspace'}
        organizationId={orgId}
        workspaceId={workspaceId}
        showBackButton
        actions={renderActions()}
      />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="prose max-w-none">
                {workspace?.content || <p className="text-gray-500 italic">No content yet. Start editing to add content.</p>}
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Files</h2>
              <FileList files={files} organizationId={orgId!} workspaceId={workspaceId!} onFileDeleted={loadFiles} />
            </div>
          </div>
        </div>
      </div>

      <FileUploadDialog
        open={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUploadComplete={handleUploadComplete}
        workspaceId={workspaceId!}
      />
    </div>
  );
};
