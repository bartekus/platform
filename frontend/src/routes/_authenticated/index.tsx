import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect } from "react";
import { projectCollection, todoCollection } from "~/lib/collections";
import { useLogto } from "@logto/react";

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
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }

    if (projects.length > 0) {
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
