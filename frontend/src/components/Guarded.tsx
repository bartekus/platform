import { ReactNode } from 'react';
import { can } from '../lib/rbac';

export function Guarded({
  role,
  need,
  children,
}: {
  role?: 'admin' | 'editor' | 'member';
  need: 'read' | 'create' | 'edit' | 'delete';
  children: ReactNode;
}) {
  if (!can[need](role)) return null;
  return <>{children}</>;
}
