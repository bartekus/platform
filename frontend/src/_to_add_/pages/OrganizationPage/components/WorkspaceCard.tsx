import { useState } from 'react';
import type { Workspace } from '~/api/workspace';
import { EditWorkspaceDialog } from './EditWorkspaceDialog';

interface WorkspaceCardProps {
  workspace: Workspace;
  onClick: () => void;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspaceId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const WorkspaceCard = ({ workspace, onClick, onEdit, onDelete, canEdit, canDelete }: WorkspaceCardProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Format date to a readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(workspace.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden relative group"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{workspace.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workspace.preview}</p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Updated {formatDate(workspace.updatedAt)}</span>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button onClick={handleEdit} className="mr-2 text-blue-600 hover:text-blue-700">
                  Edit
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete} className="text-red-600 hover:text-red-700">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditDialog && (
        <EditWorkspaceDialog workspace={workspace} onClose={() => setShowEditDialog(false)} onWorkspaceUpdated={onEdit} />
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Workspace</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this workspace? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
