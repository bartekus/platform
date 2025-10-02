import { Outlet } from 'react-router';

import { AppTopbar } from '~/components/app-topbar';

export function PageLayout() {
  return (
    <>
      <AppTopbar />
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </>
  );
}
