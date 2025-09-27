import { api } from "encore.dev/api";

// GET / (public)
export const root = api(
    { method: "GET", path: "/", expose: true }, // ensure reachable on gateway
    async () => ({ ok: true })                        // returns 200
);

// GET /health (public)
export const health = api(
    { method: "GET", path: "/health", expose: true }, // ensure reachable on gateway
    async () => ({ ok: true })                        // returns 200
);
