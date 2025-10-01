import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "~/lib/electric-proxy";

const serve = async ({ request }: { request: Request }) => {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Extract user ID from JWT token (you'd need to decode and verify it)
  const userId = "USER_ID_FROM_TOKEN"; // TODO: Extract from verified JWT

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "todos");
  const filter = `'${userId}' = ANY(user_ids)`;
  originUrl.searchParams.set("where", filter);

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/todos")({
  server: {
    handlers: {
      GET: serve,
    },
  },
});
