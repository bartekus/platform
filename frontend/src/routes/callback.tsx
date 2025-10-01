import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLogto, useHandleSignInCallback } from "@logto/react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
  ssr: false,
});

function CallbackPage() {
  const { isAuthenticated } = useLogto();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { isLoading } = useHandleSignInCallback(() => {
    // Redirect to home page after sign-in
    navigate({ to: "/" });
  });

  // useEffect(() => {
  //   const processCallback = async () => {
  //     try {
  //       // Use handleSignInCallback to process the OAuth callback
  //
  //     } catch (err) {
  //       console.error("Error handling sign-in callback:", err);
  //       setError(err instanceof Error ? err.message : "Authentication failed");
  //     }
  //   };
  //
  //   if (!isAuthenticated) {
  //     processCallback();
  //   } else {
  //     navigate({ to: "/" });
  //   }
  // }, [useHandleSignInCallback, isAuthenticated, navigate]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we complete your authentication.</p>
        </div>
      </div>
    );
  }

  return null;
}
