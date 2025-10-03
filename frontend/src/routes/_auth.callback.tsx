import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useLogto, useHandleSignInCallback } from "@logto/react";

import { appConfig, encoreApiEndpoint } from "~/config/logto";
import { fallbackToRoot, onboardingProfile, onboardingSubscription } from "~/config/constants";
import type { OrganizationData, UserSubscription, UserCustomData } from "~/types";

export const Route = createFileRoute("/_auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = Route.useNavigate();

  const { isLoading, error } = useHandleSignInCallback(() => {
    // Generally you would put the navigate("/<somewhere>") here.
    // However we want a more granual approach to properly implement onboarding.
    // For that we are going to rely on useEffect which requires placement outside of this function scope.
    // Please note that we are not importing isAuthenticated from this handler.
    // This is due to isAuthenticated state not being reliable at this stage.
    // We are going to use useLogto provided hooks to get most up-to-date state of our auth.
  });

  const { isAuthenticated, getAccessToken, fetchUserInfo } = useLogto();

  useEffect(() => {
    const resolveLogtoProvided = async () => {
      if (isLoading && !isAuthenticated) {
        return;
      }

      if (!isLoading && isAuthenticated) {
        try {
          const accessToken = await getAccessToken(appConfig.apiResourceIndicator);
          console.log("accessToken", accessToken);

          const userInfo = await fetchUserInfo();
          const customData = userInfo?.custom_data as UserCustomData;

          if (!customData?.stripeCustomerId) {
            await navigate({ to: fallbackToRoot });
            return;
          }

          console.log("customData", customData);

          // Check subscription status from custom_data
          const hasActiveSubscription = customData?.subscription?.status === "active";

          console.log("hasActiveSubscription", hasActiveSubscription);

          if (!hasActiveSubscription) {
            await navigate({ to: onboardingSubscription });
            return;
          }

          if (hasActiveSubscription) {
            await navigate({ to: onboardingProfile });
            return;
          }

          //
          // if (!s.onboarding.completed) {
          //   await navigate({ to: onboardingProfile });
          //   return;
          // }
          //
          // if (!s.defaultOrgId) {
          //   await navigate({ to: onboardingOrganization });
          //   return;
          // }
          //
          // await navigate({ to: `/org/${s.defaultOrgId}` });
          //
          // const userInfo = await fetchUserInfo();
          // const organizationData = (userInfo?.organization_data || []) as OrganizationData[];
          //
          // console.log(organizationData);
        } catch (error) {
          console.error("Failed to fetch organizations:", error);
        } finally {
          console.log("done");
        }
      }
    };

    void resolveLogtoProvided();
  }, [isLoading, isAuthenticated, fetchUserInfo, getAccessToken, navigate]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto p-8 border rounded-2xl bg-destructive/10 text-destructive">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
        <p className="text-lg text-muted-foreground">Signing you in...</p>
      </div>
    );
  }

  return null;
}
