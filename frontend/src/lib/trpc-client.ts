import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "~/routes/api/trpc/$";

// Global variable to store the access token
let globalAccessToken: string | null = null;

export function setGlobalAccessToken(token: string | null) {
  globalAccessToken = token;
}

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      async headers() {
        const headers: Record<string, string> = {
          cookie: typeof document !== "undefined" ? document.cookie : "",
        };

        // Add global access token if available
        if (globalAccessToken) {
          headers.authorization = `Bearer ${globalAccessToken}`;
        }

        return headers;
      },
    }),
  ],
});
