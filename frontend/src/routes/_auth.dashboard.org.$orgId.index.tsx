import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import getRequestClient from "~/lib/get-request-client";
import { Activity, Users, FolderOpen } from "lucide-react";
import { useLogto } from "@logto/react";
import { useLogtoApi } from "~/api/logto/logto";
import { useWorkspaceApi } from "~/api/backend/workspace";
import type { Organization, Workspace } from "~/types";

export const Route = createFileRoute("/_auth/dashboard/org/$orgId/")({
  component: OrgHomePage,
});

function OrgHomePage() {
  const { orgId } = Route.useParams();
  const { isAuthenticated } = useLogto();
  const { getUserOrganizationScopes, getUserOrganizations } = useLogtoApi();
  const { getWorkspaces, updateWorkspace, deleteWorkspace } = useWorkspaceApi();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editWorkspaceId, setEditWorkspaceId] = useState<Workspace["id"]>();
  const [userScopes, setUserScopes] = useState<string[]>([]); // const [data

  const [summary, setSummary] = useState<{ workspaces: number; members: number; files: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const [usersOrganizations, scopes, workspacesData] = await Promise.all([
          getUserOrganizations(),
          getUserOrganizationScopes(orgId),
          getWorkspaces(orgId),
        ]);

        setOrganizations(usersOrganizations);
        setUserScopes(scopes);
        setWorkspaces(workspacesData);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [orgId, isAuthenticated, getWorkspaces, getUserOrganizationScopes, getUserOrganizations]);

  // useEffect(() => {
  //   getRequestClient()
  //     .orgs.getSummary({ orgId })
  //     .then(setSummary)
  //     .catch((e) => console.error("Failed to load summary:", e));
  // }, [orgId]);

  if (!summary) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Organization Overview</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard title="Workspaces" value={summary.workspaces} icon={<FolderOpen className="h-6 w-6 text-accent" />} />
        <StatCard title="Members" value={summary.members} icon={<Users className="h-6 w-6 text-accent" />} />
        <StatCard title="Recent Files" value={summary.files} icon={<Activity className="h-6 w-6 text-accent" />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-6 gradient-card shadow-sm hover:shadow-md transition-smooth">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{title}</div>
        {icon}
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
