import { useSession } from "~/lib/session";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

/**
 * Component to test and demonstrate the session flow
 */
export function SessionFlowTest() {
  const { session, isLoading, error, refreshSession } = useSession();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading session...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <h3 className="font-semibold mb-2">Session Error</h3>
            <p className="mb-4">{error.message}</p>
            <Button onClick={refreshSession}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p>No session available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOnboardingStatus = () => {
    if (!session.subscription || session.subscription.status !== "active") {
      return { status: "subscription", message: "Needs active subscription", color: "destructive" };
    }
    if (!session.onboarding.profileCompleted) {
      return { status: "profile", message: "Needs profile completion", color: "secondary" };
    }
    if (!session.onboarding.organizationCompleted) {
      return { status: "organization", message: "Needs organization setup", color: "secondary" };
    }
    return { status: "complete", message: "Fully onboarded", color: "default" };
  };

  const onboardingStatus = getOnboardingStatus();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
          <CardDescription>Current user session information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>User:</strong>
              <p className="text-sm text-muted-foreground">
                {session.user?.name || session.user?.username || "Unknown"}
              </p>
            </div>
            <div>
              <strong>Subscription:</strong>
              <Badge variant={session.subscription?.status === "active" ? "default" : "destructive"}>
                {session.subscription?.status || "None"}
              </Badge>
            </div>
          </div>

          <div>
            <strong>Onboarding Status:</strong>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={session.subscription?.status === "active" ? "default" : "destructive"}>
                  Subscription
                </Badge>
                <span className="text-sm">
                  {session.subscription?.status === "active" ? "✅ Active" : "❌ Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.onboarding.profileCompleted ? "default" : "secondary"}>
                  Profile
                </Badge>
                <span className="text-sm">
                  {session.onboarding.profileCompleted ? "✅ Complete" : "❌ Incomplete"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.onboarding.organizationCompleted ? "default" : "secondary"}>
                  Organization
                </Badge>
                <span className="text-sm">
                  {session.onboarding.organizationCompleted ? "✅ Complete" : "❌ Incomplete"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <strong>Current Status:</strong>
            <Badge variant={onboardingStatus.color as any} className="ml-2">
              {onboardingStatus.message}
            </Badge>
          </div>

          {session.organizations.length > 0 && (
            <div>
              <strong>Organizations:</strong>
              <div className="mt-2 space-y-1">
                {session.organizations.map(org => (
                  <div key={org.id} className="text-sm">
                    {org.name} ({org.role || "member"})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={refreshSession} variant="outline">
              Refresh Session
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(session.lastUpdated).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Flow</CardTitle>
          <CardDescription>Where users should be redirected based on their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>No subscription → <code>/onboarding/subscription</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>No profile → <code>/onboarding/profile</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>No organization → <code>/onboarding/organization</code></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Complete → <code>/org/{session.defaultOrgId || 'default'}</code></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
