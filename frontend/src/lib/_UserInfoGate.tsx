import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "@tanstack/react-router";

import { fetchOidcUserInfo, needsOnboarding, nextRouteFor, UnauthorizedError } from "~/api/logto";
import { authConfig } from "~/config/logto";
import type { User } from "~/types";

export default function UserInfoGate() {
  const { getAccessToken, signOut } = useLogto();
  const navigate = useNavigate();

  const {
    data: user,
    isFetching,
    status,
    error,
  } = useQuery<User, Error>({
    queryKey: ["user"],
    queryFn: () => fetchOidcUserInfo(getAccessToken),
    retry: false,
    refetchInterval: (q) => (needsOnboarding(q.state.data as User | undefined) ? 2000 : false),
  });

  // react to errors here (v5)
  useEffect(() => {
    if (error instanceof UnauthorizedError) {
      (async () => {
        await signOut(authConfig.signOutRedirectUri);

        await navigate({ to: "/signin", replace: true });
      })();
    }
  }, [error, signOut, navigate]);

  if (status === "success" && needsOnboarding(user)) {
    navigate({ to: nextRouteFor(user!), replace: true });
    return null;
  }

  if (status === "pending" || isFetching) {
    return <div>Finalizing your account…</div>;
  }

  return <Outlet />;
}
