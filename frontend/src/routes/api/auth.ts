import { createFileRoute } from "@tanstack/react-router";

// Remove better-auth handler - Logto handles auth on client side
// This endpoint can be removed or used for custom auth logic if needed

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      // Logto doesn't need server-side auth handlers in this setup
      // Auth is handled client-side with @logto/react
    },
  },
});
