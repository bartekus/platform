import { useLogto } from "@logto/react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { fallbackToRoot, onboardingOrganization, onboardingProfile, onboardingSubscription } from "~/config/constants";
import { User, UserCustomData, UserProfile, OrganizationData } from "~/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useUserApi } from "~/api/backend/user";

export const Route = createFileRoute(`${onboardingProfile}`)({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const { isAuthenticated, fetchUserInfo } = useLogto();
  const { updateUserProfile } = useUserApi();

  const [loading, setLoading] = useState(false);

  // TODO: Figure out why oidc is not returning profile
  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const user = await fetchUserInfo();
        await qc.invalidateQueries({ queryKey: ["user"] });

        const customData = user?.custom_data as UserCustomData;

        if (!customData?.stripeCustomerId) {
          console.error("No Stripe customer ID found");
          await navigate({ to: fallbackToRoot });
          return;
        }

        const profileData = user?.profile as UserProfile;

        const hasUsername = user?.username;
        const hasProfileZoneinfo = profileData?.zoneinfo;
        const hasProfileLocale = profileData?.locale;

        if (hasUsername || hasProfileZoneinfo || hasProfileLocale) {
          await navigate({ to: onboardingOrganization });
        }

        return;
      } catch (error) {
        console.error("Profile verification error:", error);
        window.location.href = "/error";
      }
    };

    checkUserProfile();
  }, [isAuthenticated, fetchUserInfo, navigate, qc]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      await updateUserProfile(payload as User);
      await qc.invalidateQueries({ queryKey: ["user"] });

      setLoading(false);
      //
      // await navigate({ to: onboardingOrganization });
    } catch (error) {
      console.error("Profile update error:", error);
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete your profile</h1>
          <p className="text-muted-foreground">Tell us a bit about yourself</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneinfo">Time Zone</Label>
            <Input id="zoneinfo" name="zoneinfo" placeholder="America/Edmonton" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Input id="locale" name="locale" placeholder="en-CA" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
