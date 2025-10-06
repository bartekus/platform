import { useLogto } from "@logto/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useLogtoApi } from "~/api/logto";
import OrgSwitcher from "~/components/OrgSwitcher";
import { useWorkspaceApi } from "~/api/workspace";

import type { Organization, Workspace } from "~/types";
import { useOrganizationApi } from "~/api/organization";

export const Route = createFileRoute("/_auth/dashboard/org/$orgId")({
  component: OrgLayout,
});

function OrgLayout() {
  const { orgId } = Route.useParams();
  const { isAuthenticated } = useLogto();
  const { getAllOrganizations } = useOrganizationApi();
  const { getUserOrganizationScopes, getUserOrganizations } = useLogtoApi();
  const { getWorkspaces, updateWorkspace, deleteWorkspace } = useWorkspaceApi();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editWorkspaceId, setEditWorkspaceId] = useState<Workspace["id"]>();
  const [userScopes, setUserScopes] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      const userOrgs = await getUserOrganizations();

      if (!userOrgs || !userOrgs.length) {
        throw new Error("User has no organizations");
      }

      const orgIdsList = userOrgs.map((org: Organization) => org.id);

      try {
        const [usersOrganizations, scopes, workspacesData] = await Promise.all([
          getAllOrganizations({ orgIdsList }),
          getUserOrganizationScopes(orgId),
          getWorkspaces(orgId),
        ]);

        console.log(usersOrganizations);
        console.log(scopes);
        console.log(workspacesData);

        setOrganizations(usersOrganizations.organizations);
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

  if (!organizations) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading organization...</p>
      </div>
    );
  }

  // Get current organization from session or fallback
  const currentOrg = organizations.find((o) => o.id === orgId) || {
    id: orgId,
    name: "Default Organization",
    role: "admin" as const,
  };

  // Convert organizations to the format expected by OrgSwitcher
  const orgsForSwitcher =
    organizations.map((org) => ({
      id: org.id,
      name: org.name,
      role: (org?.role || "member") as "admin" | "editor" | "member",
    })) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 py-3">
            <Link to="/" className="text-lg font-semibold">
              Platform
            </Link>
            <nav className="flex gap-6">
              <Link
                to={`/dashboard/org/${currentOrg.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Overview
              </Link>
              <Link
                to={`/dashboard/org/${currentOrg.id}/workspaces`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Workspaces
              </Link>
              <Link
                to={`/dashboard/org/${currentOrg.id}/members`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Members
              </Link>
              <Link
                to={`/dashboard/org/${currentOrg.id}/settings`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Settings
              </Link>
              {currentOrg?.role === "admin" && (
                <Link
                  to={`/dashboard/org/${currentOrg.id}/admin`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                  activeProps={{ className: "text-foreground font-medium" }}
                >
                  Admin
                </Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-4">
              <OrgSwitcher orgs={orgsForSwitcher} currentId={currentOrg.id} />
              <Link to="/signout" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
