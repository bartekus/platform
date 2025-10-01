import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { useEffect, useState } from "react";

import { appConfig } from "~/config/logto";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
  ssr: false,
});

function CallbackPage() {
  const { signIn, isAuthenticated } = useLogto();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        await signIn(appConfig.signInRedirectUri);

        // Wait a moment for auth state to settle
        setTimeout(() => {
          navigate({ to: "/" });
        }, 100);
      } catch (err) {
        console.error("Error handling sign-in callback:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    if (!isAuthenticated) {
      processCallback();
    } else {
      navigate({ to: "/" });
    }
  }, [signIn, isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}

// export const Route = createFileRoute("/callback")({
//   component: RouteComponent,
// });
//
// function RouteComponent() {
//   return <div>Hello "/callback"!</div>;
// }
