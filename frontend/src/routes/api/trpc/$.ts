import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "~/lib/trpc";
import { projectsRouter } from "~/lib/trpc/projects";
import { todosRouter } from "~/lib/trpc/todos";
import { usersRouter } from "~/lib/trpc/users";
import { db } from "~/db/connection";

export const appRouter = router({
  projects: projectsRouter,
  todos: todosRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;

const serve = ({ request }: { request: Request }) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () => {
      // For TanStack Start with client-side auth, we'll pass user info from client
      // The session will be available via cookies set by Logto
      const cookieHeader = request.headers.get('cookie') || '';
      
      // TODO: Implement proper session extraction from Logto cookies
      // For now, we'll return a basic context
      return {
        db,
        session: null, // Will be populated from Logto session
      };
    },
  });
};

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
    },
  },
});
