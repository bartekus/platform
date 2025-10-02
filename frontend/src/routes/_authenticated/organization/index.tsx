import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { useLiveQuery } from "@tanstack/react-db";

import { organizationsCollection } from "~/lib/collections-new";
import { useResourceApi } from "~/lib/api/resource";
import { useAuth } from "~/lib/use-auth";

export const Route = createFileRoute("/_authenticated/organization/")({
  component: OrganizationIndex,
  ssr: false,
  loader: async () => {
    await organizationsCollection.preload();
    return null;
  },
});

function OrganizationIndex() {
  const navigate = useNavigate();
  const { isAuthenticated, getUserInfo } = useAuth();
  const { createOrganization } = useResourceApi();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time organizations from Electric SQL
  const { data: electricOrgs } = useLiveQuery((q) => q.from({ organizationsCollection }));

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isAuthenticated) return;

      try {
        const userInfo = await getUserInfo();
        const organizationData = (userInfo?.organization_data || []) as any[];
        setOrganizations(organizationData);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [isAuthenticated, getUserInfo]);

  const handleOrgClick = (orgId: string) => {
    navigate({ to: `/organization/${orgId}` });
  };

  const handleCreateSuccess = (orgId: string) => {
    navigate({ to: `/organization/${orgId}` });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Organizations</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.length === 0 ? (
            <div className="col-span-full">
              <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-4 mb-8">
                <div className="text-center">
                  <h3 className="text-lg font-light text-gray-500">You don&apos;t have any organizations yet</h3>
                </div>
              </div>
              {/* TODO: Add CreateOrganizationForm component */}
            </div>
          ) : (
            organizations.map((org) => (
              <div
                key={org.id}
                onClick={() => handleOrgClick(org.id)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-6 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                  {org.role && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{org.role}</span>}
                </div>
                {org.description && <p className="text-sm text-gray-600 mb-4">{org.description}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
