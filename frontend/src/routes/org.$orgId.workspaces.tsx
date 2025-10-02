import { createFileRoute } from '@tanstack/react-router';

export const Route = (createFileRoute as any)('/org/$orgId/workspaces')({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Workspaces</h1>
      <p className="text-muted-foreground">Workspace management coming soon...</p>
    </div>
  );
}
