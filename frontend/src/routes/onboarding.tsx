import * as React from "react";
import { useLogto } from "@logto/react";
import { Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fetchOidcUserInfo, needsOnboarding, nextRouteFor, UnauthorizedError } from "~/api/helpers/onboard";
import { authConfig } from "~/config/logto";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const qc = useQueryClient();
  const { isLoading, getAccessToken, isAuthenticated, signOut } = useLogto();
  const navigate = useNavigate();

  const {
    data: user,
    status,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetchOidcUserInfo(getAccessToken),
    retry: false,
    refetchInterval: (q) => (needsOnboarding(q.state.data) ? 2000 : false),
  });

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  React.useEffect(() => {
    if (error instanceof UnauthorizedError) {
      (async () => {
        await signOut(authConfig.signOutRedirectUri);

        await navigate({ to: "/signin", replace: true });
      })();
    }
  }, [error, signOut, navigate]);

  React.useEffect(() => {
    if (status === "success" && user && !needsOnboarding(user)) {
      console.log("nextRouteFor(user)", nextRouteFor(user));

      navigate({ to: nextRouteFor(user), replace: true });
    }
  }, [status, user, navigate]);

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
        <Outlet />
      </main>
    </div>
  );
}
