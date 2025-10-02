import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { organizationsCollection } from "~/lib/collections-new";

export const Route = createFileRoute(`/_authenticated/`)({
  component: IndexRedirect,
  ssr: false,
  loader: async () => {
    await organizationsCollection.preload();
    return null;
  },
});

function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to organizations page
    navigate({ to: "/organization", replace: true });
  }, [navigate]);

  return (
    <div className="p-6">
      <div className="text-center">
        <p className="text-gray-500">Redirecting to organizations...</p>
      </div>
    </div>
  );
}
