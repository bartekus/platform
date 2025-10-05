import { LogIn } from "lucide-react";
import { useLogto } from "@logto/react";
import { Button } from "~/components/ui/button";
import { redirect, createFileRoute, useNavigate } from "@tanstack/react-router";

import { authConfig } from "~/config/logto";
import { useEffect, useState } from "react";
import { fallbackToRoot, onboardingOrganization, onboardingProfile, onboardingSubscription } from "~/config/constants";
import { UserCustomData, UserProfile } from "~/types";
// import { z } from "zod";

const { signInRedirectUri } = authConfig;

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const { isLoading, isAuthenticated, fetchUserInfo, signIn } = useLogto();
  const navigate = Route.useNavigate();
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const search = Route.useSearch();

  useEffect(() => {
    const checkIfAlreadyAuthenticated = async () => {
      try {
        if (!isLoading && isAuthenticated) {
          const userInfo = await fetchUserInfo();

          const customData = userInfo?.custom_data as UserCustomData;

          // Check subscription status from custom_data
          const hasActiveSubscription = customData?.subscription?.status === "active";
          // Check profile status from userInfo
          const hasUsername = !!userInfo?.username;
          // Check profile status from userInfo
          const hasOrganization = userInfo?.organizations && userInfo?.organizations?.length > 0;
          const firstOrg = userInfo?.organizations?.[0];

          setIsResolving(false);

          if (!hasActiveSubscription) {
            await navigate({ to: onboardingSubscription, replace: true });
            return;
          }

          if (hasActiveSubscription && !hasUsername) {
            await navigate({ to: onboardingProfile, replace: true });
            return;
          }

          if (hasActiveSubscription && hasUsername && !hasOrganization) {
            await navigate({ to: onboardingOrganization, replace: true });
            return;
          }

          if (hasActiveSubscription && hasUsername && hasOrganization) {
            await navigate({ to: `/dashboard/org/${firstOrg}`, replace: true });
            return;
          }
        }
      } catch (error) {
        console.error("checkIfAlreadyAuthenticated verification error:", error);
        window.location.href = "/error";
      }
    };

    void checkIfAlreadyAuthenticated();
  }, [isLoading, isAuthenticated, fetchUserInfo, navigate]);

  const handleSignIn = () => {
    signIn(`${signInRedirectUri}`);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto p-8 border rounded-2xl gradient-card shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          {search.redirect ? (
            <p className="text-red-500">You need to login to access this page.</p>
          ) : (
            <p className="text-muted-foreground">Sign in to continue to your account</p>
          )}
        </div>

        <Button variant="accent" size="lg" className="w-full" onClick={handleSignIn}>
          <LogIn className="mr-2 h-5 w-5" />
          Continue with Logto
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-6">Don't have an account? You'll create one during sign-in.</p>
      </div>
    </div>
  );
}
