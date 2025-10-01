import * as React from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { useLiveQuery } from "@tanstack/react-db";
import { projectCollection } from "~/lib/collections";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
  beforeLoad: async ({ location }) => {
    // Check auth on client side only
    if (typeof window !== "undefined") {
      // This will be checked in the component
      return;
    }
  },
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading, fetchUserInfo } = useLogto();
  const navigate = useNavigate();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);

  const { data: projects, isLoading: projectsLoading } = useLiveQuery((q) => q.from({ projectCollection }));

  // Fetch user info when authenticated
  useEffect(() => {
    if (isAuthenticated && !userInfo) {
      fetchUserInfo().then(setUserInfo).catch(console.error);
    }
  }, [isAuthenticated, fetchUserInfo, userInfo]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Create an initial default project if the user doesn't yet have any
  useEffect(() => {
    if (userInfo && projects && !projectsLoading) {
      const hasProject = projects.length > 0;
      if (!hasProject) {
        projectCollection.insert({
          id: Math.floor(Math.random() * 100000),
          name: "Default",
          description: "Default project",
          owner_id: userInfo.sub,
          shared_user_ids: [],
          created_at: new Date(),
        });
      }
    }
  }, [userInfo, projects, projectsLoading]);

  const handleLogout = async () => {
    const { signOut } = useLogto();
    await signOut(`https://${import.meta.env?.VITE_WEB_DOMAIN || window?.__ENV__?.VITE_WEB_DOMAIN}/`);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim() && userInfo) {
      projectCollection.insert({
        id: Math.floor(Math.random() * 100000),
        name: newProjectName.trim(),
        description: "",
        owner_id: userInfo.sub,
        shared_user_ids: [],
        created_at: new Date(),
      });
      setNewProjectName("");
      setShowNewProjectForm(false);
    }
  };

  if (isLoading || !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">TanStack DB / Electric Starter</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{userInfo.email || userInfo.username}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Projects</h2>
              <button onClick={() => setShowNewProjectForm(!showNewProjectForm)} className="p-1 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>

            {showNewProjectForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  placeholder="Project name"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateProject}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewProjectForm(false)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <nav className="space-y-1">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to="/project/$projectId"
                  params={{ projectId: project.id.toString() }}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  {project.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
