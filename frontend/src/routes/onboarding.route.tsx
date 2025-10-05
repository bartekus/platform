import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLogto } from "@logto/react";
import { fetchProfile, needsOnboarding } from "~/lib/api";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const qc = useQueryClient();
  const { getAccessToken } = useLogto();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(getAccessToken),
    refetchInterval: (q) => (needsOnboarding(q.state.data) ? 2000 : false),
  });

  // When backend finishes onboarding (e.g., org created/attached), bounce to app
  if (profile && !needsOnboarding(profile)) {
    navigate({ to: "/app", replace: true });
    return null;
  }

  // Render onboarding UI; on any “continue” button, trigger server action then:
  async function onDidSomething() {
    // await fetch('/api/onboarding/step', { ... })
    await qc.invalidateQueries({ queryKey: ["profile"] });
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
