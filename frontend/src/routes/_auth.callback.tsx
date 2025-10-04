import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useLogto, useHandleSignInCallback } from "@logto/react";

import { authConfig, encoreApiEndpoint } from "~/config/logto";
import { callback, fallbackToRoot, onboardingProfile, onboardingSubscription } from "~/config/constants";
import type { OrganizationData, UserSubscription, UserCustomData, UserData } from "~/types";
import { sleep } from "~/lib/utils";

export const Route = createFileRoute("/_auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = Route.useNavigate();
  const [isResolving, setIsResolving] = useState<boolean>(false);

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
          setIsResolving(true);
          await sleep(5000);

          const accessToken = await getAccessToken(authConfig.apiResourceIndicator);
          console.log("accessToken", accessToken);

          const userInfo = (await fetchUserInfo()) as UserData;
          const customData = userInfo?.custom_data as UserCustomData;

          // Check subscription status from custom_data
          const hasActiveSubscription = customData?.subscription?.status === "active";

          setIsResolving(false);

          if (!hasActiveSubscription) {
            await navigate({ to: onboardingSubscription, replace: true });
            return;
          }

          if (hasActiveSubscription) {
            await navigate({ to: onboardingProfile, replace: true });
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
        }
      }
    };

    void resolveLogtoProvided();
  }, [isLoading, isAuthenticated, fetchUserInfo, getAccessToken, navigate, setIsResolving]);

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

  if (isLoading || isResolving) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
        <p className="text-lg text-muted-foreground">Signing you in...</p>
      </div>
    );
  }

  return null;
}
