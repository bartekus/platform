import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/org/$orgId/members")({
  component: MembersPage,
});

function MembersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Members</h1>
      <p className="text-muted-foreground">Member management coming soon...</p>
    </div>
  );
}
