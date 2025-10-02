import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHandleSignInCallback } from "@logto/react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
  ssr: false,
});

function CallbackPage() {
  const navigate = useNavigate();

  const { isLoading } = useHandleSignInCallback(() => {
    // Redirect to home page after sign-in
    navigate({ to: "/" });
  });

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
