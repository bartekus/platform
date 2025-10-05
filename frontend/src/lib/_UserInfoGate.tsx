import { useLogto } from "@logto/react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "@tanstack/react-router";

import { fetchUserInfo, needsOnboarding, type UserInfo } from "~/api/logto";

export default function UserInfoGate() {
  const { getAccessToken } = useLogto();

  // Poll until onboarding completes.
  const {
    data: userInfo,
    isFetching,
    status,
    refetch,
  } = useQuery<UserInfo>({
    queryKey: ["userInfo"],
    queryFn: () => fetchUserInfo(getAccessToken),
    // poll every 2s while the data is incomplete
    refetchInterval: (q) => (needsOnboarding(q.state.data as UserInfo | undefined) ? 2000 : false),
    // if your backend pushes updates, you can also set staleTime generously
  });

  const navigate = useNavigate();

  // Route users who need to finish onboarding
  if (status === "success" && needsOnboarding(userInfo)) {
    // keep a dedicated onboarding route; it can also refetch ['userInfo']
    navigate({ to: "/onboarding", replace: true });
    return null;
  }

  // While initially resolving (or between polls), render something lightweight
  if (status === "pending" || isFetching) {
    return <div>Finalizing your account…</div>;
  }

  // All good → render protected content
  return <Outlet />;
}
