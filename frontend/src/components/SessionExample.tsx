import { useSession } from "~/lib/session";
import { Button } from "~/components/ui/button";

/**
 * Example component demonstrating how to use the new session system
 */
export function SessionExample() {
  const { session, isLoading, error, refreshSession, clearSession } = useSession();

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-semibold">Session Error</h3>
        <p className="text-red-600">{error.message}</p>
        <Button onClick={refreshSession} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!session) {
    return <div>No session available</div>;
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Session Information</h3>
      
      <div>
        <strong>User:</strong> {session.user?.name || session.user?.username || "Unknown"}
      </div>
      
      <div>
        <strong>Subscription Status:</strong> {session.subscription?.status || "None"}
      </div>
      
      <div>
        <strong>Onboarding Status:</strong>
        <ul className="ml-4 list-disc">
          <li>Profile: {session.onboarding.profileCompleted ? "✅" : "❌"}</li>
          <li>Organization: {session.onboarding.organizationCompleted ? "✅" : "❌"}</li>
          <li>Overall: {session.onboarding.completed ? "✅" : "❌"}</li>
        </ul>
      </div>
      
      <div>
        <strong>Organizations:</strong>
        <ul className="ml-4 list-disc">
          {session.organizations.map(org => (
            <li key={org.id}>
              {org.name} ({org.role || "member"})
            </li>
          ))}
        </ul>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={refreshSession} variant="outline">
          Refresh Session
        </Button>
        <Button onClick={clearSession} variant="destructive">
          Clear Session
        </Button>
      </div>
      
      <div className="text-sm text-gray-500">
        Last updated: {new Date(session.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
