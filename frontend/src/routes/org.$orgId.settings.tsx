import { createFileRoute } from '@tanstack/react-router';

export const Route = (createFileRoute as any)('/org/$orgId/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <p className="text-muted-foreground">Organization settings coming soon...</p>
    </div>
  );
}
