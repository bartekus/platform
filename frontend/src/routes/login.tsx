import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { useEffect } from "react";
import { appConfig } from "~/config/logto";

export const Route = createFileRoute(`/login`)({
  component: LoginPage,
  ssr: false,
});

function LoginPage() {
  const { signIn, isAuthenticated } = useLogto();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      window.location.href = "/";
      return;
    }

    // Automatically redirect to Logto sign-in
    signIn(appConfig.signInRedirectUri);
  }, [signIn, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Redirecting to sign in...
        </h2>
        <p className="text-gray-600">Please wait while we redirect you to the login page.</p>
      </div>
    </div>
  );
}
