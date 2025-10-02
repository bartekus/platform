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

// Simple JWT decode function (without verification for now)
function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

const serve = ({ request }: { request: Request }) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () => {
      // Extract authorization header
      const authHeader = request.headers.get("authorization");

      let session = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        // Decode the JWT to extract user info
        const payload = decodeJWT(token);

        if (payload && payload.sub) {
          session = {
            user: {
              id: payload.sub, // Use the actual user ID from the JWT
            },
          };
        }
      }

      return {
        db,
        session,
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
