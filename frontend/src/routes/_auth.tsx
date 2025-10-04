import * as React from "react";
import { useLogto } from "@logto/react";
import { createFileRoute } from "@tanstack/react-router";
import { Link, Outlet, redirect, useRouter } from "@tanstack/react-router";

import { authConfig } from "~/config/logto";
const { signOutRedirectUri } = authConfig;

export const Route = createFileRoute("/_auth")({
  // beforeLoad: async ({ context, location }) => {
  //   const { isAuthenticated } = await context.auth();
  //
  //   if (!isAuthenticated) {
  //     throw redirect({
  //       to: "/signin",
  //       search: {
  //         redirect: location.href,
  //       },
  //     });
  //   }
  // },
  component: AuthLayout,
});

function AuthLayout() {
  const { signOut } = useLogto();

  const handleSignOut = () => {
    signOut(`${signOutRedirectUri}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Platform
          </Link>
          <nav className="ml-auto flex gap-4">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-smooth hover:underline"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
