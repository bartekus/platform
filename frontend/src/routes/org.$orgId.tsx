import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireOnboarding } from "~/lib/guards";
import { loadSession, Session, Role } from "~/lib/session";
import OrgSwitcher from "~/components/OrgSwitcher";

export const Route = createFileRoute("/org/$orgId")({
  beforeLoad: requireOnboarding,
  component: OrgLayout,
});

function OrgLayout() {
  const { orgId } = Route.useParams();
  const [data, setData] = useState<{ session: Session; org: { id: string; name: string; slug: string; role: Role } } | null>(null);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      const org = session.orgs.find((o) => o.id === orgId);
      if (!org) {
        window.location.href = "/onboarding/organization";
        return;
      }
      setData({ session, org });
    })();
  }, [orgId]);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading organization...</p>
      </div>
    );
  }

  const { session, org } = data;

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
                to={`/org/${org.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Overview
              </Link>
              <Link
                to={`/org/${org.id}/workspaces`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Workspaces
              </Link>
              <Link
                to={`/org/${org.id}/members`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Members
              </Link>
              <Link
                to={`/org/${org.id}/settings`}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Settings
              </Link>
              {org.role === "admin" && (
                <Link
                  to={`/org/${org.id}/admin`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                  activeProps={{ className: "text-foreground font-medium" }}
                >
                  Admin
                </Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-4">
              <OrgSwitcher orgs={session.orgs} currentId={org.id} />
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
