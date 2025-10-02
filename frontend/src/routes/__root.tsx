import { Outlet, createRootRoute as createRootRouteBase } from "@tanstack/react-router";
import { LogtoProvider } from "@logto/react";
import { config } from "~/config/logto";
import LayoutRoot from "~/components/LayoutRoot";

export const rootRoute = createRootRouteBase({
  component: () => (
    <LogtoProvider config={config}>
      <LayoutRoot>
        <Outlet />
      </LayoutRoot>
    </LogtoProvider>
  ),
  notFoundComponent: () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Not found</h1>
      <a href="/" className="text-accent hover:underline">
        Go home
      </a>
    </div>
  ),
});

export const Route = rootRoute;
