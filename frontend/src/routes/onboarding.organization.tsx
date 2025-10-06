import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { onboardingOrganization } from "~/config/constants";
import { useOrganizationApi } from "~/api/backend/organization";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const Route = createFileRoute(`${onboardingOrganization}`)({
  component: OrganizationPage,
});

function OrganizationPage() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const { createOrganization } = useOrganizationApi();

  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      const org = await createOrganization(payload as any);
      await qc.invalidateQueries({ queryKey: ["user"] });

      setLoading(false);

      return;
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
            <Input id="name" name="name" placeholder="My organization" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="A brief description of the organization" required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}
