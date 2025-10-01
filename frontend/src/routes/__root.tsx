import * as React from "react";
import { Outlet, HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LogtoProvider } from "@logto/react";
import { config } from "~/config/logto";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
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
        title: `TanStack DB / Electric Starter`,
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
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <LogtoProvider config={config}>{children}</LogtoProvider>
        <Scripts />
      </body>
    </html>
  );
}
