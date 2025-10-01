import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "~/lib/electric-proxy";

const serve = async ({ request }: { request: Request }) => {
  // Since we're using client-side auth, we need to get the user ID from the request
  // In a full implementation, you'd verify the Logto token server-side
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Extract user ID from JWT token (you'd need to decode and verify it)
  // For now, this is a placeholder - implement proper JWT verification
  const userId = "USER_ID_FROM_TOKEN"; // TODO: Extract from verified JWT

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "projects");
  const filter = `owner_id = '${userId}' OR '${userId}' = ANY(shared_user_ids)`;
  originUrl.searchParams.set("where", filter);

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: serve,
    },
  },
});
