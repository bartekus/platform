import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { Loader2 } from "lucide-react";

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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5; // Maximum number of retries

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

        // Wait for webhook to process (2 seconds base + increasing delay with each retry)
        const delay = 2000 + retryCount * 1000; // 2s, 3s, 4s, 5s, 6s
        console.log(`Waiting for webhook to process... (attempt ${retryCount + 1}/${maxRetries}, delay: ${delay}ms)`);
        await sleep(delay);

        // Force refresh user info to get updated custom data
        const userInfo = await fetchUserInfo();
        const customData = userInfo?.custom_data as UserCustomData;

        console.log(`Fetched user info (attempt ${retryCount + 1}):`, userInfo);
        console.log("Custom data:", customData);

        // Check if we have subscription data
        const hasActiveSubscription = customData?.subscription?.status === "active";

        if (!hasActiveSubscription) {
          if (retryCount < maxRetries - 1) {
            // Still no subscription, retry
            console.log(`Subscription not yet active, retrying... (${retryCount + 1}/${maxRetries})`);
            setRetryCount((prev) => prev + 1);
            return;
          } else {
            // Max retries reached, redirect to subscription page
            console.log("Max retries reached, redirecting to subscription page");
            await navigate({ to: onboardingSubscription, replace: true });
            return;
          }
        }

        // Subscription is active - force refresh session data
        console.log("Subscription verified! Force refreshing session...");

        // Proceed to profile
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
  }, [isAuthenticated, fetchUserInfo, getAccessToken, navigate, retryCount]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
      <h1 className="text-2xl font-semibold mb-2">Finalizing your subscription</h1>
      <p className="text-muted-foreground">
        {retryCount > 0
          ? `Verifying subscription... (attempt ${retryCount + 1}/${maxRetries})`
          : "Waiting for payment confirmation..."}
      </p>
      {retryCount > 0 && (
        <p className="text-sm text-muted-foreground mt-2">This may take a few moments while we process your payment</p>
      )}
    </div>
  );
}
