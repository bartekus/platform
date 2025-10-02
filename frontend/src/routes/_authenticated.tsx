import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useLogto } from "@logto/react";
import { useLiveQuery } from "@tanstack/react-db";

import { organizationsCollection } from "~/lib/collections-new";
import { syncUserToDatabase } from "~/lib/user-sync";
import { useAuth } from "~/lib/use-auth";

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
  const { isAuthenticated, isLoading, getUserInfo } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);

  // Real-time organizations from Electric SQL
  const { data: organizations, isLoading: organizationsLoading } = useLiveQuery((q) => q.from({ organizationsCollection }));

  // Fetch user info when authenticated
  useEffect(() => {
    if (isAuthenticated && !userInfo) {
      getUserInfo()
        .then((info) => {
          setUserInfo(info);
          // Sync user to database
          syncUserToDatabase(info);
        })
        .catch(console.error);
    }
  }, [isAuthenticated, getUserInfo, userInfo]);

  // Redirect to login if not authenticated (but only after loading is complete)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Organizations are managed through Logto, no need to create default ones

  const handleLogout = async () => {
    const { signOut } = useLogto();
    await signOut(`https://${import.meta.env?.VITE_WEB_DOMAIN || window?.__ENV__?.VITE_WEB_DOMAIN}/`);
  };

  // Project creation is now handled by organization management

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show loading while user info is being fetched
  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading user info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">Platform</h1>
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
              <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
            </div>

            <nav className="space-y-1">
              <Link to="/organization" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                All Organizations
              </Link>
              {organizations?.map((org) => (
                <Link
                  key={org.id}
                  to="/organization/$orgId"
                  params={{ orgId: org.id }}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  {org.name}
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
