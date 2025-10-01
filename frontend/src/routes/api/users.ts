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

  const originUrl = prepareElectricUrl(request.url);
  originUrl.searchParams.set("table", "users");

  return proxyElectricRequest(originUrl);
};

export const Route = createFileRoute("/api/users")({
  server: {
    handlers: {
      GET: serve,
    },
  },
});
