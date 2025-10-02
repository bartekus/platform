import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import getRequestClient from "~/lib/get-request-client";
import { Activity, Users, FolderOpen } from "lucide-react";

export const Route = (createFileRoute as any)("/org/$orgId/")({
  component: OrgHomePage,
});

function OrgHomePage() {
  const { orgId } = Route.useParams();
  const [summary, setSummary] = useState<{ workspaces: number; members: number; files: number } | null>(null);

  useEffect(() => {
    getRequestClient()
      .orgs.getSummary({ orgId })
      .then(setSummary)
      .catch((e) => console.error("Failed to load summary:", e));
  }, [orgId]);

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
