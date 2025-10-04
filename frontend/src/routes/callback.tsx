import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useLogto, useHandleSignInCallback } from "@logto/react";

import { authConfig } from "~/config/logto";
import { fallbackToRoot, onboardingProfile, onboardingSubscription, onboardingOrganization } from "~/config/constants";
import { sessionManager } from "~/lib/session";
import { sleep } from "~/lib/utils";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = Route.useNavigate();
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const { isLoading, error } = useHandleSignInCallback(() => {
    // Generally you would put the navigate("/<somewhere>") here.
    // However we want a more granular approach to properly implement onboarding.
    // For that we are going to rely on useEffect which requires placement outside of this function scope.
    // Please note that we are not importing isAuthenticated from this handler.
    // This is due to isAuthenticated state not being reliable at this stage.
    // We are going to use useLogto provided hooks to get most up-to-date state of our auth.
  });

  const { isAuthenticated, getAccessToken, fetchUserInfo } = useLogto();

  useEffect(() => {
    const resolveLogtoCallback = async () => {
      if (isLoading && !isAuthenticated) {
        return;
      }

      if (!isLoading && isAuthenticated) {
        try {
          setIsResolving(true);

          // Give Logto a moment to fully initialize
          await sleep(2000);

          // Initialize the session manager with Logto hooks
          sessionManager.setLogtoHooksGetter(() => ({
            getAccessToken,
            fetchUserInfo,
          }));

          // Load the session using our new session system
          const session = await sessionManager.loadSession();

          console.log("Session loaded:", session);

          setIsResolving(false);

          // Determine where to redirect based on onboarding status
          if (!session.subscription || session.subscription.status !== "active") {
            // No active subscription - redirect to subscription page
            await navigate({ to: onboardingSubscription, replace: true });
            return;
          }

          if (!session.onboarding.profileCompleted) {
            // Has subscription but profile not completed - redirect to profile
            await navigate({ to: onboardingProfile, replace: true });
            return;
          }

          if (!session.onboarding.organizationCompleted) {
            // Profile completed but no organization - redirect to organization setup
            await navigate({ to: onboardingOrganization, replace: true });
            return;
          }

          // User is fully onboarded - redirect to their default organization
          if (session.defaultOrgId) {
            await navigate({ to: `/org/${session.defaultOrgId}`, replace: true });
            return;
          }

          // Fallback - redirect to organization setup if no default org
          await navigate({ to: onboardingOrganization, replace: true });
        } catch (error) {
          console.error("Failed to resolve callback:", error);
          setIsResolving(false);

          // On error, redirect to fallback
          await navigate({ to: fallbackToRoot, replace: true });
        }
      }
    };

    void resolveLogtoCallback();
  }, [isLoading, isAuthenticated, fetchUserInfo, getAccessToken, navigate]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto p-8 border rounded-2xl bg-destructive/10 text-destructive">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p>{error.message}</p>
          <button
            onClick={() => navigate({ to: fallbackToRoot })}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || isResolving) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
        <p className="text-lg text-muted-foreground">{isLoading ? "Signing you in..." : "Setting up your account..."}</p>
      </div>
    );
  }

  return null;
}
