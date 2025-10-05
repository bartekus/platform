import { createFileRoute } from "@tanstack/react-router";
import ProfileGate from "~/lib/_UserInfoGate";

export const Route = createFileRoute("/_auth/dashboard/__layout")({
  component: ProfileGate,
});
