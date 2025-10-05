import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLogto } from "@logto/react";

export default function SessionGate() {
  const { isLoading, isAuthenticated } = useLogto();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: "/signin",
        search: { redirect: location.href ?? window.location.href },
        replace: true,
      });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  if (isLoading) return <div>Checking session…</div>;
  return <Outlet />;
}
