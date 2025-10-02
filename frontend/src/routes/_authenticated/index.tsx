import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { projectCollection, todoCollection } from "~/lib/collections";

export const Route = createFileRoute(`/_authenticated/`)({
  component: IndexRedirect,
  ssr: false,
  loader: async () => {
    await Promise.all([projectCollection.preload(), todoCollection.preload()]);
    return null;
  },
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useLogto();
  const { data: projects } = useLiveQuery((q) => q.from({ projectCollection }));

  useEffect(() => {
    // Only redirect if we're authenticated and not loading
    if (!isLoading && isAuthenticated && projects && projects.length > 0) {
      const firstProject = projects[0];
      navigate({
        to: `/project/$projectId`,
        params: { projectId: firstProject.id.toString() },
        replace: true,
      });
    }
  }, [projects, navigate, isAuthenticated, isLoading]);

  return (
    <div className="p-6">
      <div className="text-center">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    </div>
  );
}
