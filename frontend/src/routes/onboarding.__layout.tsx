import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLogto } from "@logto/react";
import { fetchUserInfo, needsOnboarding } from "~/api/logto";
import { useEffect } from "react";
import { fallbackToRoot, onboardingOrganization } from "~/config/constants";
import { UserCustomData, UserProfile } from "~/types";

export const Route = createFileRoute("/onboarding/__layout")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const qc = useQueryClient();
  const { getAccessToken, isAuthenticated } = useLogto();
  const navigate = useNavigate();

  const { data: userInfo } = useQuery({
    queryKey: ["userInfo"],
    queryFn: () => fetchUserInfo(getAccessToken),
    refetchInterval: (q) => (needsOnboarding(q.state.data) ? 2000 : false),
  });

  useEffect(() => {
    const checkUserProfile = async () => {
      console.log("Onboard Route");
      if (!isAuthenticated) {
        await navigate({ to: fallbackToRoot });
        return;
      }

      try {
        // When backend finishes onboarding (e.g., org created/attached), bounce to dashboard
        if (userInfo && !needsOnboarding(userInfo)) {
          const firstOrgId = userInfo?.organization_data?.[0]?.id;

          console.log("firstOrgId", firstOrgId);
          if (firstOrgId) {
            navigate({ to: `/dashboard/org/${firstOrgId}`, replace: true });
          }

          return null;
        }
      } catch (error) {
        console.error("Profile verification error:", error);
        window.location.href = "/error";
      }
    };

    checkUserProfile();
  }, [isAuthenticated, navigate, qc, userInfo]);

  // Render onboarding UI; on any “continue” button, trigger server action then:
  async function onDidSomething() {
    // await fetch('/api/onboarding/step', { ... })
    await qc.invalidateQueries({ queryKey: ["userInfo"] });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Platform
          </Link>
          <nav className="ml-auto flex gap-4">
            <Link to="/signout" className="text-sm text-muted-foreground hover:text-foreground transition-smooth hover:underline">
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <h1>Welcome—let’s finish setting things up</h1>
        <button onClick={onDidSomething}>I did the thing</button>
        <Outlet />
      </main>
    </div>
  );
}
