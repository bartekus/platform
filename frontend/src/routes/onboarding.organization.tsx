import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requireActiveSub } from "~/lib/guards";
import getRequestClient from "~/lib/get-request-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const Route = (createFileRoute as any)("/onboarding/organization")({
  beforeLoad: requireActiveSub,
  component: OrganizationPage,
});

function OrganizationPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      const org = await getRequestClient().orgs.create(payload as any);
      window.location.replace(`/org/${org.id}`);
    } catch (error) {
      console.error("Organization creation error:", error);
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create your organization</h1>
          <p className="text-muted-foreground">Your organization is where you'll manage teams and workspaces</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input id="name" name="name" placeholder="Acme Corp" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input id="slug" name="slug" placeholder="acme-corp" pattern="[a-z0-9-]+" required />
            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and hyphens</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}
