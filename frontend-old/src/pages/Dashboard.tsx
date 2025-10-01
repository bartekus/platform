import { useLogto } from '@logto/react';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';

import CreateOrganizationForm from '~/components/create-organization-form';

type OrganizationData = {
  id: string;
  name: string;
  description: string | null;
  role?: string;
};

export function Dashboard() {
  const { isAuthenticated, fetchUserInfo } = useLogto();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        const userInfo = await fetchUserInfo();
        const organizationData = (userInfo?.organization_data || []) as OrganizationData[];

        setOrganizations(organizationData);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [isAuthenticated, fetchUserInfo]);

  const handleOrgClick = (orgId: string) => {
    navigate(`/${orgId}`);
  };

  const handleCreateSuccess = (orgId: string) => {
    navigate(`/${orgId}`);
  };

  return (
    <>
      {/* Organization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <div className="text-gray-500">Loading organizations...</div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="col-span-full">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-4 mb-8">
              <div className="text-center">
                <h3 className="text-lg font-light text-gray-500">You don&apos;t have any organizations yet</h3>
              </div>
            </div>
            <CreateOrganizationForm onSuccess={handleCreateSuccess} />
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
    </>
  );
}
