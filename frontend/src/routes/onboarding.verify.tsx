import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { Loader2 } from "lucide-react";

import type { UserCustomData } from "~/types";
import { fallbackToRoot, onboardingProfile, onboardingSubscription } from "~/config/constants";

export const Route = createFileRoute("/onboarding/verify")({
  // beforeLoad: requireAuth,
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = Route.useNavigate();
  const { isAuthenticated, fetchUserInfo } = useLogto();

  useEffect(() => {
    const verifySubscription = async () => {
      if (!isAuthenticated) {
        await navigate({ to: fallbackToRoot });
        return;
      }

      try {
        const userInfo = await fetchUserInfo();

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
        } else if (hasActiveSubscription) {
          await navigate({ to: onboardingProfile });
          return;
        } else {
          await navigate({ to: fallbackToRoot });
          return;
        }
      } catch (error) {
        console.error("Subscription verification error:", error);
        window.location.href = "/error";
      }
    };

    verifySubscription();
  }, [isAuthenticated, fetchUserInfo, navigate]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
      <h1 className="text-2xl font-semibold mb-2">Finalizing your subscription</h1>
      <p className="text-muted-foreground">This will only take a moment...</p>
    </div>
  );
}
