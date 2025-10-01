import { useEffect, useState } from 'react';
import { useLogto, UserInfoResponse } from '@logto/react';

import getRequestClient from '~/libs/get-request-client';
import { admin } from '~/libs/client';

export function AdminDashboard() {
  const { isAuthenticated, signIn, signOut, getAccessToken, getIdToken, fetchUserInfo } = useLogto();
  const [data, setData] = useState<admin.DashboardData>();
  const [user, setUser] = useState<undefined | UserInfoResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const getDashboardData = async () => {
      try {
        const token = await getIdToken();

        const userProfile = await fetchUserInfo();

        const client = getRequestClient(token!);

        const adminData = await client.admin.getDashboardData();

        setUser(userProfile);
        setData(adminData);
        setError(undefined);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      getDashboardData();
    }
  }, [isAuthenticated, getAccessToken]);

  if (!isAuthenticated) {
    return (
      <div>
        <h2>Please log in to access the admin dashboard</h2>
        <button onClick={() => signIn(`${window.location.origin}/callback`)}>Log In</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <button onClick={() => signOut()}>Log Out</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && <p>{data.value}</p>}
    </div>
  );
}
