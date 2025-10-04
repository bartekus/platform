import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/org/$orgId/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
      <p className="text-muted-foreground">Admin controls coming soon...</p>
    </div>
  );
}
