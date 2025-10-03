// import { ReactNode } from "react";
import { LogtoProvider } from "@logto/react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import LayoutRoot from "~/components/LayoutRoot";
import { config } from "~/config/logto";
import appCss from "../index.css?url";

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
  component: RootComponent,
  notFoundComponent: () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Not found</h1>
      <a href="/" className="text-accent hover:underline">
        Go home
      </a>
    </div>
  ),
});

function RootComponent() {
  return (
    // <RootDocument>
    <LogtoProvider config={config}>
      <LayoutRoot>
        <Outlet />
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <TanStackRouterDevtools position="bottom-left" />
      </LayoutRoot>
    </LogtoProvider>
    // </RootDocument>
  );
}
// Not available in SPA mode
// function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
//   return (
//     <html>
//       <head>
//         <HeadContent />
//       </head>
//       <body>
//         {children}
//         <Scripts />
//       </body>
//     </html>
//   );
// }
