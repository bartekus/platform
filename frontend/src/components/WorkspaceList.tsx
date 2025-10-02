import type { Workspace } from '~/lib/api/workspace';

import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onWorkspaceClick: (workspaceId: string) => void;
  onWorkspaceEdit: (workspaceId: string) => void;
  onWorkspaceDelete: (workspaceId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const WorkspaceList = ({
  workspaces,
  onWorkspaceClick,
  canEdit,
  onWorkspaceEdit,
  canDelete,
  onWorkspaceDelete,
}: WorkspaceListProps) => {
  if (!workspaces.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No workspaces yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onClick={() => onWorkspaceClick(workspace.id)}
          onEdit={() => onWorkspaceEdit(workspace.id)}
          onDelete={() => onWorkspaceDelete(workspace.id)}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
};
