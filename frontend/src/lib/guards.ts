import { redirect } from '@tanstack/react-router';
import { loadSession } from './session';

export async function requireAuth() {
  const s = await loadSession();
  if (!s.user) throw redirect({ to: '/signin' });
  return s;
}

export async function requireActiveSub() {
  const s = await requireAuth();
  if (s.subscription.status !== 'active') throw redirect({ to: '/onboarding/subscription' });
  return s;
}

export async function requireOnboarding() {
  const s = await requireActiveSub();
  if (!s.onboarding.completed) throw redirect({ to: '/onboarding/profile' });
  return s;
}

export function requireRole(min: 'member' | 'editor' | 'admin') {
  return async ({ params: { orgId } }: { params: { orgId: string } }) => {
    const s = await requireOnboarding();
    const org = s.orgs.find((o) => o.id === orgId);
    if (!org) throw redirect({ to: '/onboarding/organization' });
    const rankOrder = { member: 1, editor: 2, admin: 3 } as const;
    if (rankOrder[org.role] < rankOrder[min]) throw redirect({ to: `/org/${org.id}` });
    return { session: s, org };
  };
}

export async function requireOrgChosen() {
  const s = await requireOnboarding();
  const orgId = s.defaultOrgId;
  if (!orgId) throw redirect({ to: '/onboarding/organization' });
  return { session: s, orgId };
}
