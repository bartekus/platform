import getRequestClient from "./get-request-client";

export type Role = "admin" | "editor" | "member";

export type Session = {
  user: Awaited<ReturnType<ReturnType<typeof getRequestClient>["me"]["get"]>> | null;
  subscription: Awaited<ReturnType<ReturnType<typeof getRequestClient>["billing"]["getSubscription"]>>;
  onboarding: Awaited<ReturnType<ReturnType<typeof getRequestClient>["me"]["getOnboarding"]>>;
  orgs: Awaited<ReturnType<ReturnType<typeof getRequestClient>["orgs"]["list"]>>;
  defaultOrgId?: string;
};

export async function loadSession(): Promise<Session> {
  console.log("loadSession start");

  const api = getRequestClient();

  const [me, subscription, onboarding, orgs] = await Promise.all([
    api.me.get().catch(() => null),
    api.billing.getSubscription().catch(() => ({ status: "none" as const })),
    api.me.getOnboarding().catch(() => ({ completed: false })),
    api.orgs.list().catch(() => []),
  ]);

  return {
    user: me,
    subscription,
    onboarding,
    orgs,
    defaultOrgId: orgs?.[0]?.id,
  };
}
