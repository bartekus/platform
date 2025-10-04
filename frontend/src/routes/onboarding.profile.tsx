import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
// import { requireActiveSub } from "~/lib/guards";
import getRequestClient from "~/lib/get-request-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { fallbackToRoot, onboardingOrganization, onboardingProfile, onboardingSubscription } from "~/config/constants";
import { useLogto } from "@logto/react";
import { UserCustomData, UserProfile } from "~/types";

export const Route = createFileRoute(`${onboardingProfile}`)({
  // beforeLoad: requireActiveSub,
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const { isAuthenticated, fetchUserInfo } = useLogto();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!isAuthenticated) {
        await navigate({ to: fallbackToRoot });
        return;
      }

      try {
        const userInfo = await fetchUserInfo();

        console.log("userInfo");
        console.dir(userInfo);

        const customData = userInfo?.custom_data as UserCustomData;

        if (!customData?.stripeCustomerId) {
          console.error("No Stripe customer ID found");
          await navigate({ to: fallbackToRoot });
          return;
        }

        // Check subscription status from custom_data
        const hasActiveSubscription = customData?.subscription?.status === "active";

        if (!hasActiveSubscription) {
          await navigate({ to: onboardingSubscription });
          return;
        }

        const profileData = userInfo?.profile as UserProfile;

        const hasUsername = userInfo?.username;
        const hasProfileZoneinfo = profileData?.zoneinfo;
        const hasProfileLocale = profileData?.locale;

        if (hasUsername || hasProfileZoneinfo || hasProfileLocale) {
          await navigate({ to: onboardingOrganization });
          return;
        }
      } catch (error) {
        console.error("Subscription verification error:", error);
        window.location.href = "/error";
      }
    };

    checkUserProfile();
  }, [isAuthenticated, fetchUserInfo, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      await getRequestClient().user.updateUser(payload as any);
      await navigate({ to: onboardingSubscription });
      window.location.replace("/onboarding/organization");
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
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" name="displayName" placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeZone">Time Zone</Label>
            <Input id="timeZone" name="timeZone" placeholder="America/New_York" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
