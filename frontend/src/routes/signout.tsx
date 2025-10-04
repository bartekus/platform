import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { sessionManager } from "~/lib/session";
import { authConfig } from "~/config/logto";

export const Route = createFileRoute("/signout")({
  component: SignOutPage,
});

function SignOutPage() {
  const { signOut } = useLogto();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        // Clear our session data
        sessionManager.clearSession();
        
        // Sign out from Logto
        await signOut(authConfig.signOutRedirectUri);
      } catch (error) {
        console.error("Error during sign out:", error);
        // Even if there's an error, redirect to home
        window.location.href = "/";
      }
    };

    handleSignOut();
  }, [signOut]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-lg text-muted-foreground">Signing you out...</p>
    </div>
  );
}
