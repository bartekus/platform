/*
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { requireAuth } from "~/lib/guards";
import getRequestClient from "~/lib/get-request-client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding/verify")({
  beforeLoad: requireAuth,
  component: VerifyPage,
});

function VerifyPage() {
  const search = useSearch({ from: "/onboarding/verify" });
  const sessionId = (search as any).session_id;

  useEffect(() => {
    let stop = false;
    const api = getRequestClient();

    (async () => {
      for (let i = 0; i < 12 && !stop; i++) {
        try {
          const r = await api.billing.inspectCheckoutSession({ sessionId: sessionId ?? "" });
          if (r.status === "active") {
            window.location.replace("/onboarding/profile");
            return;
          }
        } catch (e) {
          console.error("Error checking session:", e);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();

    return () => {
      stop = true;
    };
  }, [sessionId]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
      <h1 className="text-2xl font-semibold mb-2">Finalizing your subscription</h1>
      <p className="text-muted-foreground">This will only take a moment...</p>
    </div>
  );
}
*/
