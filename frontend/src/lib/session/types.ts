import type { User, UserProfile, Subscription } from "~/lib/client";
import type { OrganizationData, UserCustomData } from "~/types";

export type Role = "admin" | "editor" | "member";

export interface SessionData {
  user: User | null;
  subscription: Subscription | null;
  onboarding: {
    completed: boolean;
    profileCompleted: boolean;
    organizationCompleted: boolean;
  };
  organizations: OrganizationData[];
  defaultOrgId?: string;
  isLoading: boolean;
  lastUpdated: number;
}

export interface SessionManagerOptions {
  refreshInterval?: number; // Auto-refresh interval in ms
  cacheTimeout?: number; // Cache expiration in ms
  enableAutoRefresh?: boolean;
}

export interface SessionManagerEvents {
  'session:loaded': (session: SessionData) => void;
  'session:updated': (session: SessionData) => void;
  'session:error': (error: Error) => void;
  'session:refreshed': (session: SessionData) => void;
}

export type SessionManagerListener<T extends keyof SessionManagerEvents> = SessionManagerEvents[T];
