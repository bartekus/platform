import { createFileRoute } from "@tanstack/react-router";
import SessionGate from "~/lib/_SessionGate";

export const Route = createFileRoute("/_auth/__layout")({
  component: SessionGate,
});
