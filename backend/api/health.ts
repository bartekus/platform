import { api } from "encore.dev/api";

// GET /health (public)
export const health = api(
    { method: "GET", path: "/health", expose: true }, // ensure reachable on gateway
    async () => ({ ok: true })                        // returns 200
);
