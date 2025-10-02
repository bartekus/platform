import { Outlet } from 'react-router';
import { SidebarProvider } from '~/components/ui/sidebar';

export function AdminLayout() {
  return (
    <SidebarProvider>
      <Outlet />
    </SidebarProvider>
  );
}
