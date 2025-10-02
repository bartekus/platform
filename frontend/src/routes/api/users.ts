import { createFileRoute } from "@tanstack/react-router";
import { prepareElectricUrl, proxyElectricRequest } from "~/lib/electric-proxy";

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

const serve = async ({ request }: { request: Request }) => {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Extract and decode JWT token
  const token = authHeader.substring(7);
  const payload = decodeJWT(token);

  if (!payload || !payload.sub) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
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
