import { useLogto } from "@logto/react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "@tanstack/react-router";

import { fetchProfile, needsOnboarding, type Profile } from "~/lib/api";

export default function ProfileGate() {
  const { getAccessToken } = useLogto();

  // Poll until onboarding completes.
  const {
    data: profile,
    isFetching,
    status,
    refetch,
  } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(getAccessToken),
    // poll every 2s while the data is incomplete
    refetchInterval: (q) => (needsOnboarding(q.state.data as Profile | undefined) ? 2000 : false),
    // if your backend pushes updates, you can also set staleTime generously
  });

  const navigate = useNavigate();

  // Route users who need to finish onboarding
  if (status === "success" && needsOnboarding(profile)) {
    // keep a dedicated onboarding route; it can also refetch ['profile']
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
