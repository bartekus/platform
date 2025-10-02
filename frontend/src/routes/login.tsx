import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "~/config/logto";

export const Route = createFileRoute(`/login`)({
  component: LoginPage,
  ssr: false,
});

function LoginPage() {
  const { signIn, isAuthenticated, isLoading } = useLogto();

  useEffect(() => {
    // Only redirect if we're authenticated and not loading
    if (!isLoading && isAuthenticated) {
      window.location.href = "/";
      return;
    }

    // Only start sign-in if we're not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      signIn(appConfig.signInRedirectUri);
    }
  }, [signIn, isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Redirecting to sign in...</h2>
        <p className="text-gray-600">Please wait while we redirect you to the login page.</p>
      </div>
    </div>
  );
}
