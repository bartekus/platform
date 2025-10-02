import { Outlet, createRootRoute as createRootRouteBase, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LogtoProvider } from "@logto/react";

import { config } from "~/config/logto";
import LayoutRoot from "~/components/LayoutRoot";

import appCss from "../index.css?url";

export const rootRoute = createRootRouteBase({
  head: () => ({
    meta: [
      {
        charSet: `utf-8`,
      },
      {
        name: `viewport`,
        content: `width=device-width, initial-scale=1`,
      },
      {
        title: `TanStack Start/DB/Electric Starter`,
      },
    ],
    links: [
      {
        rel: `stylesheet`,
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <LogtoProvider config={config}>
      <LayoutRoot>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
