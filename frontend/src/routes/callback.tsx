import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLogto, useHandleSignInCallback } from "@logto/react";

import { fallbackToRoot } from "~/config/constants";

import { User, UserCustomData } from "~/types";
import { nextRouteFor } from "~/api/onboard";

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
    const resolveUserState = async () => {
      if (isLoading && !isAuthenticated) {
        return;
      }

      if (!isLoading && isAuthenticated) {
        try {
          setIsResolving(true);

          const user = (await fetchUserInfo()) as User;
          const nextRouteUrl = nextRouteFor(user);

          setIsResolving(false);

          await navigate({ to: nextRouteUrl, replace: true });

          return null;
        } catch (error) {
          console.error("Failed to resolve Callback:", error);
        }
      }
    };

    void resolveUserState();
  }, [isLoading, isAuthenticated, fetchUserInfo, getAccessToken, navigate, setIsResolving]);

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
