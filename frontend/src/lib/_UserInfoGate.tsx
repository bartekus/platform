import { useLogto } from "@logto/react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "@tanstack/react-router";

import { fetchOidcUserInfo, needsOnboarding, nextRouteFor } from "~/api/logto";
import type { User } from "~/types";

export default function UserInfoGate() {
  const { getAccessToken } = useLogto();

  // Poll until onboarding completes.
  const {
    data: user,
    isFetching,
    status,
    refetch,
  } = useQuery<User>({
    queryKey: ["user"],
    queryFn: () => fetchOidcUserInfo(getAccessToken),
    // poll every 2s while the data is incomplete
    refetchInterval: (q) => (needsOnboarding(q.state.data as User | undefined) ? 2000 : false),
    // if your backend pushes updates, you can also set staleTime generously
  });

  const navigate = useNavigate();

  // Route users who need to finish onboarding
  if (status === "success" && needsOnboarding(user)) {
    const nextRouteUrl = nextRouteFor(user);

    navigate({ to: nextRouteUrl, replace: true });

    return null;
  }

  // While initially resolving (or between polls), render something lightweight
  if (status === "pending" || isFetching) {
    return <div>Finalizing your account…</div>;
  }

  // All good → render protected content
  return <Outlet />;
}
