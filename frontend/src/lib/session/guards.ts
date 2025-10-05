import { redirect } from "@tanstack/react-router";
import { sessionManager } from "./SessionManager";
import type { SessionData, Role } from "./types";
import { fallbackToRoot, onboardingProfile, onboardingSubscription, onboardingOrganization } from "~/config/constants";

/**
 * Require user to be authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  try {
    const session = await sessionManager.loadSession();
    
    if (!session.user) {
      throw redirect({ to: fallbackToRoot });
    }
    
    return session;
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      throw error;
    }
    throw redirect({ to: fallbackToRoot });
  }
}

/**
 * Require user to have an active subscription
 */
export async function requireActiveSub(): Promise<SessionData> {
  const session = await requireAuth();
  
  const hasActiveSubscription = session.subscription?.status === "active";
  
  if (!hasActiveSubscription) {
    throw redirect({ to: onboardingSubscription });
  }
  
  return session;
}

/**
 * Require user to have completed onboarding
 */
export async function requireOnboarding(): Promise<SessionData> {
  const session = await requireActiveSub();
  
  if (!session.onboarding.completed) {
    // Redirect to the first incomplete step
    if (!session.onboarding.profileCompleted) {
      throw redirect({ to: onboardingProfile });
    }
    if (!session.onboarding.organizationCompleted) {
      throw redirect({ to: onboardingOrganization });
    }
  }
  
  return session;
}

/**
 * Require user to have chosen an organization
 */
export async function requireOrgChosen(): Promise<{ session: SessionData; orgId: string }> {
  const session = await requireOnboarding();
  
  const orgId = session.defaultOrgId;
  if (!orgId) {
    throw redirect({ to: onboardingOrganization });
  }
  
  return { session, orgId };
}

/**
 * Require user to have a specific role in an organization
 */
export function requireRole(minRole: Role) {
  return async ({ params }: { params: { orgId: string } }): Promise<{ session: SessionData; org: { id: string; role: Role } }> => {
    const { session, orgId } = await requireOrgChosen();
    
    // Find the organization
    const org = session.organizations.find((o) => o.id === params.orgId);
    if (!org) {
      throw redirect({ to: onboardingOrganization });
    }
    
    // Check role hierarchy
    const rankOrder = { member: 1, editor: 2, admin: 3 } as const;
    const userRole = org.role as Role;
    
    if (rankOrder[userRole] < rankOrder[minRole]) {
      throw redirect({ to: `/org/${orgId}` });
    }
    
    return { 
      session, 
      org: { 
        id: org.id, 
        role: userRole 
      } 
    };
  };
}

/**
 * Require user to be admin of an organization
 */
export function requireAdmin() {
  return requireRole("admin");
}

/**
 * Require user to be editor or admin of an organization
 */
export function requireEditor() {
  return requireRole("editor");
}

/**
 * Check if user has completed a specific onboarding step
 */
export async function checkOnboardingStep(step: 'profile' | 'organization' | 'subscription'): Promise<boolean> {
  try {
    const session = await sessionManager.loadSession();
    
    if (!session) return false;
    
    switch (step) {
      case 'subscription':
        return session.subscription?.status === "active";
      case 'profile':
        return session.onboarding.profileCompleted;
      case 'organization':
        return session.onboarding.organizationCompleted;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get current session without throwing redirects
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    return await sessionManager.loadSession();
  } catch {
    return null;
  }
}
