import { createRouter as createRouterBase } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

console.log("Building router with routeTree", routeTree);

export const router = createRouterBase({ routeTree } as any);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
