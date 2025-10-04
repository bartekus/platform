import { useEffect } from "react";
import { Outlet } from "react-router";
import { useLogto } from "@logto/react";

import { authConfig } from "~/config/logto";

export const RequireAuth = () => {
  const { isAuthenticated, isLoading, signIn } = useLogto();

  useEffect(() => {
    if (!isAuthenticated) {
      void signIn(authConfig.signOutRedirectUri);
    }
  }, [isAuthenticated, isLoading, signIn]);

  return isAuthenticated ? <Outlet /> : <p>Not authenticated</p>;
};
