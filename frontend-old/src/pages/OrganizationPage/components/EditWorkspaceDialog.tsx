import { useParams } from 'react-router';
import React, { useEffect, useState } from 'react';

import { useWorkspaceApi, type Workspace } from '~/api/workspace';

interface EditWorkspaceDialogProps {
  workspace: Workspace;
  onClose: () => void;
  onWorkspaceUpdated: (workspace: Workspace) => void;
}

export const EditWorkspaceDialog = ({ workspace, onClose, onWorkspaceUpdated }: EditWorkspaceDialogProps) => {
  const { orgId: organizationId } = useParams();
  const { updateWorkspace } = useWorkspaceApi();

  const [title, setTitle] = useState(workspace.title);
  const [content, setContent] = useState(workspace.content);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(workspace.title);
    setContent(workspace.content);
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId || !workspace.id) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const updatedWorkspace = await updateWorkspace(organizationId, workspace.id, {
        title,
        content,
      });

      onWorkspaceUpdated(updatedWorkspace);
      onClose(); // Ensure the dialog closes after success
    } catch (error) {
      setError(`Failed to update workspace. Please try again. ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'mt-1 block w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 placeholder-gray-400';
  const labelClassName = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Workspace</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className={labelClassName}>
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClassName}
              placeholder="Enter workspace title"
            />
          </div>

          <div>
            <label htmlFor="content" className={labelClassName}>
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className={inputClassName}
              placeholder="Enter content"
            />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 ease-in-out"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200 ease-in-out shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
