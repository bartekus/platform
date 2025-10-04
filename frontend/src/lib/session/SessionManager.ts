import { useLogto } from "@logto/react";
import getRequestClient from "~/lib/get-request-client";
import { authConfig } from "~/config/logto";
import type { 
  SessionData, 
  SessionManagerOptions, 
  SessionManagerEvents, 
  SessionManagerListener 
} from "./types";
import type { UserCustomData, OrganizationData } from "~/types";

export class SessionManager {
  private session: SessionData | null = null;
  private listeners: Map<keyof SessionManagerEvents, Set<SessionManagerListener<any>>> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private isLoading = false;
  private options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions = {}) {
    this.options = {
      refreshInterval: options.refreshInterval ?? 5 * 60 * 1000, // 5 minutes
      cacheTimeout: options.cacheTimeout ?? 2 * 60 * 1000, // 2 minutes
      enableAutoRefresh: options.enableAutoRefresh ?? true,
    };
  }

  /**
   * Subscribe to session events
   */
  on<T extends keyof SessionManagerEvents>(
    event: T,
    listener: SessionManagerListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit events to all listeners
   */
  private emit<T extends keyof SessionManagerEvents>(
    event: T,
    ...args: Parameters<SessionManagerListener<T>>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in session event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Load session data from Logto and backend APIs
   */
  async loadSession(): Promise<SessionData> {
    if (this.isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve, reject) => {
        const unsubscribe = this.on('session:loaded', (session) => {
          unsubscribe();
          resolve(session);
        });
        this.on('session:error', (error) => {
          unsubscribe();
          reject(error);
        });
      });
    }

    this.isLoading = true;

    try {
      // Get Logto hooks - this is a bit tricky since we're in a class
      // We'll need to get these from the React context when called from components
      const { getAccessToken, fetchUserInfo } = this.getLogtoHooks();

      const [userInfo, accessToken] = await Promise.all([
        fetchUserInfo(),
        getAccessToken(authConfig.apiResourceIndicator)
      ]);

      if (!userInfo || !accessToken) {
        throw new Error("Failed to get user info or access token");
      }

      const customData = userInfo?.custom_data as UserCustomData;
      const organizationData = (userInfo?.organization_data || []) as OrganizationData[];

      // Determine onboarding status
      const profileData = userInfo?.profile;
      const hasUsername = userInfo?.username;
      const hasProfileZoneinfo = profileData?.zoneinfo;
      const hasProfileLocale = profileData?.locale;
      const profileCompleted = !!(hasUsername || hasProfileZoneinfo || hasProfileLocale);
      
      const organizationCompleted = organizationData.length > 0;
      const onboardingCompleted = profileCompleted && organizationCompleted;

      const session: SessionData = {
        user: userInfo as any,
        subscription: customData?.subscription || null,
        onboarding: {
          completed: onboardingCompleted,
          profileCompleted,
          organizationCompleted,
        },
        organizations: organizationData,
        defaultOrgId: organizationData[0]?.id,
        isLoading: false,
        lastUpdated: Date.now(),
      };

      this.session = session;
      this.isLoading = false;

      // Start auto-refresh if enabled
      if (this.options.enableAutoRefresh) {
        this.startAutoRefresh();
      }

      this.emit('session:loaded', session);
      return session;

    } catch (error) {
      this.isLoading = false;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('session:error', errorObj);
      throw errorObj;
    }
  }

  /**
   * Refresh session data
   */
  async refreshSession(): Promise<SessionData> {
    if (!this.session) {
      return this.loadSession();
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - this.session.lastUpdated < this.options.cacheTimeout) {
      return this.session;
    }

    try {
      const newSession = await this.loadSession();
      this.emit('session:refreshed', newSession);
      return newSession;
    } catch (error) {
      // If refresh fails, return cached session
      console.warn('Session refresh failed, using cached session:', error);
      return this.session;
    }
  }

  /**
   * Get current session data
   */
  getSession(): SessionData | null {
    return this.session;
  }

  /**
   * Check if session is valid and not expired
   */
  isSessionValid(): boolean {
    if (!this.session) return false;
    
    const now = Date.now();
    return now - this.session.lastUpdated < this.options.cacheTimeout;
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.session = null;
    this.stopAutoRefresh();
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.refreshSession().catch(error => {
        console.warn('Auto-refresh failed:', error);
      });
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get Logto hooks - this needs to be implemented by the caller
   * since we can't use hooks directly in a class
   */
  private getLogtoHooks() {
    // This will be overridden by the React hook wrapper
    throw new Error("getLogtoHooks must be implemented by the React hook wrapper");
  }

  /**
   * Update the Logto hooks getter
   */
  setLogtoHooksGetter(getter: () => any): void {
    this.getLogtoHooks = getter;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.listeners.clear();
    this.session = null;
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();
