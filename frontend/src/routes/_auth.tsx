import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link, Outlet } from "@tanstack/react-router";
import { requireAuth } from "~/lib/session";

export const Route = createFileRoute("/_auth")({
  beforeLoad: requireAuth,
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
