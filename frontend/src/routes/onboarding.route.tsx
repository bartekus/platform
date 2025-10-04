import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { requireAuth } from "~/lib/session";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: requireAuth,
  component: OnboardingLayout,
});

function OnboardingLayout() {
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
        <Outlet />
      </main>
    </div>
  );
}
