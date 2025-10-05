import { useEffect, useRef, useState, useCallback } from "react";
import { useLogto } from "@logto/react";
import { sessionManager } from "./SessionManager";
import type { SessionData } from "./types";

export function useSession() {
  const { isAuthenticated, getAccessToken, fetchUserInfo } = useLogto();
  const [session, setSession] = useState<SessionData | null>(sessionManager.getSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isInitialized = useRef(false);

  // Initialize the session manager with Logto hooks
  useEffect(() => {
    if (!isInitialized.current) {
      sessionManager.setLogtoHooksGetter(() => ({
        getAccessToken,
        fetchUserInfo,
      }));
      isInitialized.current = true;
    }
  }, [getAccessToken, fetchUserInfo]);

  // Load session when authenticated
  useEffect(() => {
    if (isAuthenticated && !session) {
      loadSession();
    } else if (!isAuthenticated && session) {
      sessionManager.clearSession();
      setSession(null);
    }
  }, [isAuthenticated, session]);

  const loadSession = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const newSession = await sessionManager.loadSession();
      setSession(newSession);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to load session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const newSession = await sessionManager.refreshSession();
      setSession(newSession);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to refresh session:", error);
    }
  }, [isAuthenticated]);

  const clearSession = useCallback(() => {
    sessionManager.clearSession();
    setSession(null);
    setError(null);
  }, []);

  // Subscribe to session events
  useEffect(() => {
    const unsubscribeLoaded = sessionManager.on('session:loaded', (newSession) => {
      setSession(newSession);
      setIsLoading(false);
      setError(null);
    });

    const unsubscribeUpdated = sessionManager.on('session:updated', (newSession) => {
      setSession(newSession);
    });

    const unsubscribeRefreshed = sessionManager.on('session:refreshed', (newSession) => {
      setSession(newSession);
    });

    const unsubscribeError = sessionManager.on('session:error', (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeUpdated();
      unsubscribeRefreshed();
      unsubscribeError();
    };
  }, []);

  return {
    session,
    isLoading,
    error,
    loadSession,
    refreshSession,
    clearSession,
    isAuthenticated,
  };
}
