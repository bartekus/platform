export type Profile = {
  sub: string;
  email?: string;
  customData?: {
    orgId?: string;
    roles?: string[];
    // ...anything else your onboarding writes
  };
};

export async function fetchProfile(getAccessToken: () => Promise<string | undefined>): Promise<Profile> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token");
  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

// Whatever “done” means for you:
export function needsOnboarding(p?: Profile) {
  return !p?.customData?.orgId || !p?.customData?.roles?.length;
}
