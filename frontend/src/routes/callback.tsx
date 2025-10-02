import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { loadSession } from "~/lib/session";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const logto = useLogto();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Handle Logto callback
        if (logto.isAuthenticated) {
          const s = await loadSession();

          if (!s.user) {
            window.location.href = "/";
            return;
          }

          if (s.subscription.status !== "active") {
            window.location.href = "/onboarding/subscription";
            return;
          }

          if (!s.onboarding.completed) {
            window.location.href = "/onboarding/profile";
            return;
          }

          if (!s.defaultOrgId) {
            window.location.href = "/onboarding/organization";
            return;
          }

          window.location.replace(`/org/${s.defaultOrgId}`);
        }
      } catch (e: any) {
        setError(e.message ?? "Authentication error");
      }
    })();
  }, [logto]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto p-8 border rounded-2xl bg-destructive/10 text-destructive">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
      <p className="text-lg text-muted-foreground">Signing you in...</p>
    </div>
  );
}
