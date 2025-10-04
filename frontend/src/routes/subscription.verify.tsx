import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { Loader2 } from "lucide-react";

import { sessionManager } from "~/lib/session";
import type { UserCustomData } from "~/types";
import { fallbackToRoot, onboardingProfile, onboardingSubscription } from "~/config/constants";
import { sleep } from "~/lib/utils";

export const Route = createFileRoute("/subscription/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = Route.useNavigate();
  const { isAuthenticated, fetchUserInfo, getAccessToken } = useLogto();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifySubscription = async () => {
      // Wait for authentication to be ready
      if (!isAuthenticated) {
        console.log("VerifyPage not authenticated");
        // If not authenticated, redirect to callback to handle auth
        await navigate({ to: "/callback", replace: true });
        return;
      }

      try {
        setIsVerifying(true);

        await sleep(2000);

        // Initialize session manager if not already done
        sessionManager.setLogtoHooksGetter(() => ({
          getAccessToken,
          fetchUserInfo,
        }));

        // Load session to get updated subscription status
        const session = await sessionManager.loadSession({ forceRefresh: true });

        console.log("Verification session:", session);

        // Check subscription status
        const hasActiveSubscription = session.subscription?.status === "active";

        if (!hasActiveSubscription) {
          // Still no active subscription - might need to wait or retry
          console.log("Subscription not yet active, redirecting to subscription page");
          await navigate({ to: onboardingSubscription, replace: true });
          return;
        }

        // Subscription is active - proceed to profile
        console.log("Subscription verified, proceeding to profile");
        await navigate({ to: onboardingProfile, replace: true });
      } catch (error) {
        console.error("Subscription verification error:", error);
        await navigate({ to: fallbackToRoot, replace: true });
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [isAuthenticated, fetchUserInfo, getAccessToken, navigate]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
      <h1 className="text-2xl font-semibold mb-2">Finalizing your subscription</h1>
      <p className="text-muted-foreground">{isVerifying ? "Verifying your subscription..." : "This will only take a moment..."}</p>
    </div>
  );
}
