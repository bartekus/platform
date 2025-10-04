import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
// import { requireActiveSub } from "~/lib/guards";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { fallbackToRoot, onboardingOrganization, onboardingSubscription } from "~/config/constants";
import { useLogto } from "@logto/react";
import { useOrganizationApi } from "~/api/organization";
import { OrganizationData, UserCustomData, UserProfile } from "~/types";

export const Route = createFileRoute(`${onboardingOrganization}`)({
  // beforeLoad: requireActiveSub,
  component: OrganizationPage,
});

function OrganizationPage() {
  const navigate = Route.useNavigate();
  const { isAuthenticated, fetchUserInfo } = useLogto();
  const { createOrganization, getOrganizations } = useOrganizationApi();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUserOrganizations = async () => {
      if (!isAuthenticated) {
        await navigate({ to: fallbackToRoot });
        return;
      }

      try {
        const userInfo = await fetchUserInfo();
        const organizationData = (userInfo?.organization_data || []) as OrganizationData[];

        if (!organizationData.length === 0) {
          await navigate({ to: organizationData[0].id });
          return;
        }
      } catch (error) {
        console.error("Onboarding organization error:", error);
      }
    };

    checkUserOrganizations();
  }, [isAuthenticated, fetchUserInfo, createOrganization, getOrganizations, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      const org = await createOrganization(payload as any);
      await navigate({ to: `/org/${org.id}` });
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
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Acme Corp where leadership thrives" required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}
