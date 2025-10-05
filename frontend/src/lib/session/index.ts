// Export types
export type { SessionData, SessionManagerOptions, Role } from "./types";

// Export SessionManager class
export { SessionManager, sessionManager } from "./SessionManager";

// Export React hook
export { useSession } from "./useSession";

// Export guard functions
export {
  requireAuth,
  requireActiveSub,
  requireOnboarding,
  requireOrgChosen,
  requireRole,
  requireAdmin,
  requireEditor,
  checkOnboardingStep,
  getCurrentSession,
} from "./guards";
