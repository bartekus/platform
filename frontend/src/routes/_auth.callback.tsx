import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto, useHandleSignInCallback } from "@logto/react";
import { Loader2 } from "lucide-react";

import { appConfig, encoreApiEndpoint } from "~/config/logto";

export const Route = createFileRoute("/_auth/callback")({
  component: CallbackPage,
});

interface UserSubscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodEnd: number;
}

interface UserCustomData {
  subscription?: UserSubscription;
  stripeCustomerId?: string;
}

type OrganizationData = {
  id: string;
  name: string;
  description: string | null;
  role?: string;
};

const fallback = "/" as const;
const onboardingSubscription = "/onboarding/subscription" as const;
const onboardingProfile = "/onboarding/profile" as const;
const onboardingOrganization = "/onboarding/organization" as const;

function CallbackPage() {
  const navigate = Route.useNavigate();

  const { isLoading, error } = useHandleSignInCallback(() => {
    // After successful sign-in, redirect to verification
    // navigate("/");
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
            await navigate({ to: fallback });
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

    resolveLogtoProvided();
  }, [isLoading, isAuthenticated, fetchUserInfo, getAccessToken, navigate]);

  // useEffect(() => {
  //
  // }, [logto]);

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
