import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { authConfig } from "~/config/logto";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

export default function SessionGate() {
  const { isLoading, isAuthenticated, signIn } = useLogto();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("SessionGate");
      void signIn(authConfig.signOutRedirectUri);
      // navigate({
      //   to: "/signin",
      //   search: { redirect: location.href ?? window.location.href },
      //   replace: true,
      // });
    }
  }, [isLoading, isAuthenticated, navigate, location, signIn]);

  if (isLoading) {
    return <div>Checking session…</div>;
  }

  return <Outlet />;
}
