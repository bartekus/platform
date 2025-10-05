import { createRouter as createRouterBase } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { sessionManager } from "./lib/session";

console.log("Building router with routeTree", routeTree);

export const router = createRouterBase({ 
  routeTree,
  context: {
    sessionManager,
  }
} as any);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
